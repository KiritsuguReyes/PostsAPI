import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from '@nestjs/swagger';
import { ApiResponse } from '../responses/api-response';
import { RedisCacheService } from '../cache/redis-cache.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly mongoConnection: Connection,
    private readonly redisCache: RedisCacheService,
  ) {}
  @Get()
  @ApiOperation({ 
    summary: 'Health check completo', 
    description: 'Verificar el estado del servidor con información detallada de sistema y memoria' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Health check exitoso',
    example: {
      success: true,
      message: 'Health check exitoso',
      timestamp: '2026-03-14T08:40:00.000Z',
      data: {
        status: 'ok',
        timestamp: '2026-03-14T08:40:00.000Z',
        uptime: 3600.5,
        memory: {
          rss: 45678912,
          heapTotal: 25165824,
          heapUsed: 18923456,
          external: 1234567
        },
        environment: 'development'
      }
    }
  })
  async check() {
    const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const mongoState = mongoStates[this.mongoConnection.readyState] ?? 'unknown';
    const isMongoHealthy = this.mongoConnection.readyState === 1;
    const isRedisHealthy = this.redisCache.isConnected();

    const overallHealthy = isMongoHealthy && isRedisHealthy;

    const healthData = {
      status: overallHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: mongoState,
        healthy: isMongoHealthy,
      },
      cache: {
        status: isRedisHealthy ? 'connected' : 'disconnected',
        healthy: isRedisHealthy,
      },
    };

    const msg = overallHealthy
      ? 'Health check exitoso'
      : !isMongoHealthy
        ? 'Servicio degradado - base de datos no disponible'
        : 'Servicio degradado - cache no disponible';

    return ApiResponse.success(healthData, msg);
  }

  @Get('ping')
  @ApiOperation({ 
    summary: 'Ping básico', 
    description: 'Verificación rápida de que el servidor está activo y respondiendo' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Server activo',
    example: {
      success: true,
      message: 'Server activo',
      timestamp: '2026-03-14T08:40:00.000Z',
      data: {
        message: 'pong'
      }
    }
  })
  ping() {
    return ApiResponse.success({ message: 'pong' }, 'Server activo');
  }
}
