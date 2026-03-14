import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from '@nestjs/swagger';
import { ApiResponse } from '../responses/api-response';

@ApiTags('Health')
@Controller('health')
export class HealthController {
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
  check() {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };
    
    return ApiResponse.success(healthData, 'Health check exitoso');
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
