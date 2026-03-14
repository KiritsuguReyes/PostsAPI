import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponse } from '../common/responses/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Registrar nuevo usuario', 
    description: 'Crea un nuevo usuario en el sistema. Este endpoint es público y no requiere autenticación.' 
  })
  @SwaggerApiResponse({ 
    status: 201, 
    description: 'Usuario creado exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 400, 
    description: 'Datos de usuario inválidos' 
  })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    const { password, ...userWithoutPassword } = (user as any).toObject();
    return ApiResponse.success(userWithoutPassword, 'Usuario creado exitosamente');
  }

  @Get()
  @ApiOperation({ 
    summary: 'Obtener todos los usuarios', 
    description: 'Lista usuarios registrados con límite opcional (máx 100 000). Requiere autenticación JWT.' 
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Máximo de registros a devolver (máx 100 000)', example: 50 })
  @ApiBearerAuth('JWT-auth')
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Usuarios obtenidos exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 401, 
    description: 'No autorizado - Token JWT requerido' 
  })
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const users = await this.usersService.findAll(parsedLimit);
    return ApiResponse.success(users, 'Usuarios obtenidos exitosamente');
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener usuario por ID', 
    description: 'Obtiene un usuario específico por su ID. Requiere autenticación JWT.' 
  })
  @ApiBearerAuth('JWT-auth')
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Usuario obtenido exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 401, 
    description: 'No autorizado - Token JWT requerido' 
  })
  @SwaggerApiResponse({ 
    status: 404, 
    description: 'Usuario no encontrado' 
  })
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return ApiResponse.success(user, 'Usuario obtenido exitosamente');
  }
}
