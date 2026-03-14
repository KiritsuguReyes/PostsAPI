import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Comprimir responses para reducir bandwidth
  app.use(compression());
  
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
    origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
