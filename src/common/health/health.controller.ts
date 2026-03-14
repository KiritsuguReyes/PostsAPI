import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from '@nestjs/swagger';
import { ApiResponse } from '../responses/api-response';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
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
  ping() {
    return ApiResponse.success({ message: 'pong' }, 'Server activo');
  }
}
