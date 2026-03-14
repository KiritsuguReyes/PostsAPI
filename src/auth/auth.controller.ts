import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ApiResponse } from '../common/responses/api-response';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ 
    summary: 'Iniciar sesión', 
    description: 'Autenticar usuario con email y contraseña, devuelve JWT token' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Login exitoso',
    example: {
      success: true,
      message: 'Login exitoso',
      timestamp: '2026-03-14T07:21:00.000Z',
      data: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '65fd1234567890abcdef1234',
          email: 'alvaro@reyes.com',
          name: 'Juan Pérez',
          role: 'user'
        }
      }
    }
  })
  @SwaggerApiResponse({ 
    status: 401, 
    description: 'Credenciales inválidas' 
  })
  @SwaggerApiResponse({ 
    status: 429, 
    description: 'Demasiados intentos de login' 
  })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos de login por minuto
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return ApiResponse.success(result, 'Login exitoso');
  }
}
