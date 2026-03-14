import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HealthController } from './common/health/health.controller';
import { RedisCacheModule } from './common/cache/redis-cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: process.env.MONGODB_URI || configService.get<string>('MONGODB_URI'),
        // Optimizaciones de conexión para alta carga
        maxPoolSize: 50,     // Máximo 50 conexiones concurrentes
        minPoolSize: 5,      // Mínimo 5 conexiones activas
        maxIdleTimeMS: 30000,// 30s timeout para conexiones idle
        serverSelectionTimeoutMS: 5000, // 5s timeout para seleccionar servidor
        socketTimeoutMS: 45000, // 45s socket timeout
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Redis compartido entre todas las instancias → rate limiting correcto
        // en deploys con múltiples workers/pods
        storage: new ThrottlerStorageRedisService(
          new Redis(process.env.REDIS_URL || configService.get<string>('REDIS_URL'), {
            lazyConnect: true,
            maxRetriesPerRequest: 2,
          }),
        ),
        throttlers: [{
          ttl: 60000,   // 60 segundos
          limit: 100,   // 100 requests por minuto por IP (globalizado)
        }],
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: process.env.JWT_SECRET || configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
      inject: [ConfigService],
    }),
    RedisCacheModule,
    PostsModule,
    CommentsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  onModuleInit() {
    this.logger.log('El módulo de la aplicación se ha inicializado y la conexión a la base de datos debería estar establecida.');
  }
}
