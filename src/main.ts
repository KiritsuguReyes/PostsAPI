import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import open from 'open';
import * as cluster from 'cluster';
import * as os from 'os';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Comprimir responses para reducir bandwidth
  app.use(compression());

  // Versionado URI: /v1/posts, /v2/posts, etc.
  // Permite añadir nuevas versiones sin romper clientes que usen versiones anteriores
  app.enableVersioning({ type: VersioningType.URI });
  
  // Aplicar Global Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());
  
  // Aplicar ValidationPipe global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // CORS optimizado para producción
  app.enableCors({
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:4200', 'https://localhost'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
    credentials: true,
  });

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Posts API')
    .setDescription('API REST para gestión de Posts, Comentarios y Usuarios con autenticación JWT\n\n**Versión actual:** v1\n\nTodos los endpoints tienen el prefijo `/v1/`. Ejemplo: `GET /v1/posts`')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Ingresa tu token JWT',
        in: 'header',
      },
      'JWT-auth'
    )
    .addTag('Auth', 'Endpoints de autenticación y login')
    .addTag('Posts', 'CRUD de Posts con paginación y filtros')
    .addTag('Comments', 'CRUD de Comentarios por posts')
    .addTag('Users', 'Gestión de usuarios')
    .addTag('Health', 'Health checks y monitoreo')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Posts API - Documentación',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
    },
    explorer: true,
    jsonDocumentUrl: 'api/json',  // URL para descargar JSON
    yamlDocumentUrl: 'api/yaml',  // URL para descargar YAML
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api`);
  
  // Abrir Swagger UI automáticamente en el navegador (solo en entorno de desarrollo)
  if (process.env.NODE_ENV !== 'production') {
    const swaggerUrl = `http://localhost:${port}/api`;
    console.log(`🚀 Opening Swagger UI in browser: ${swaggerUrl}`);
    try {
      await open(swaggerUrl);
    } catch (error) {
      console.log('⚠️  Could not open browser automatically. Please visit the URL manually.');
    }
  }
}

// ── Clustering ────────────────────────────────────────────────────────────────
// En producción: 1 worker por CPU core, el master solo supervisa y reinicia.
// En desarrollo: proceso único (debug más sencillo).
const numCPUs = os.cpus().length;
const clusterModule = cluster as unknown as import('cluster').Cluster;

if (clusterModule.isPrimary && process.env.NODE_ENV === 'production') {
  console.log(`🖥️  Master ${process.pid} arrancando ${numCPUs} workers (1 por CPU core)...`);

  for (let i = 0; i < numCPUs; i++) {
    clusterModule.fork();
  }

  clusterModule.on('exit', (worker, code, signal) => {
    console.warn(
      `⚠️  Worker ${worker.process.pid} terminó (${signal ?? code}). Reiniciando...`,
    );
    clusterModule.fork();
  });
} else {
  // Worker en producción o proceso único en desarrollo
  bootstrap();
}
