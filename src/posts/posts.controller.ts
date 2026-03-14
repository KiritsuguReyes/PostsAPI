import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse, ApiBearerAuth, ApiBody, ApiQuery, ApiExtraModels } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ApiResponse } from '../common/responses/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Posts')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'posts', version: '1' })
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear nuevo post', 
    description: 'Crea un nuevo post con título, contenido y autor' 
  })
  @SwaggerApiResponse({ 
    status: 201, 
    description: 'Post creado exitosamente' 
  })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(ValidationPipe) createPostDto: CreatePostDto) {
    const post = await this.postsService.create(createPostDto);
    return ApiResponse.success(post, 'Post creado exitosamente');
  }

  @Post('bulk')
  @ApiOperation({ 
    summary: 'Carga masiva de posts', 
    description: 'Crea múltiples posts en una sola operación. Envía un array de objetos CreatePostDto en el body.'
  })
  @ApiBody({
    description: 'Array de posts para crear en lote',
    type: [CreatePostDto],
    examples: {
      'bulk-posts': {
        summary: 'Ejemplo de carga masiva',
        value: [
          {
            title: 'Introducción a NestJS',
            body: 'NestJS es un framework progresivo de Node.js para construir aplicaciones escalables.',
            author: 'María García'
          },
          {
            title: 'Angular Signals',
            body: 'Los signals de Angular revolucionan la gestión de estado reactivo.',
            author: 'Carlos López'
          }
        ]
      }
    }
  })
  @SwaggerApiResponse({ 
    status: 201, 
    description: 'Posts creados exitosamente en carga masiva',
    example: {
      success: true,
      message: '2 posts creados exitosamente en carga masiva',
      timestamp: '2026-03-14T07:50:16.000Z',
      data: [
        {
          _id: '65fd1234567890abcdef1234',
          title: 'Introducción a NestJS',
          body: 'NestJS es un framework progresivo de Node.js para construir aplicaciones escalables.',
          author: 'María García',
          createdAt: '2026-03-14T07:50:16.000Z'
        },
        {
          _id: '65fd1234567890abcdef1235', 
          title: 'Angular Signals',
          body: 'Los signals de Angular revolucionan la gestión de estado reactivo.',
          author: 'Carlos López',
          createdAt: '2026-03-14T07:50:16.000Z'
        }
      ]
    }
  })
  @SwaggerApiResponse({ 
    status: 400, 
    description: 'Datos inválidos en el array de posts' 
  })
  @HttpCode(HttpStatus.CREATED)
  async createBulk(@Body(ValidationPipe) createPostDtos: CreatePostDto[]) {
    const posts = await this.postsService.createBulk(createPostDtos);
    return ApiResponse.success(
      posts, 
      `${posts.length} posts creados exitosamente en carga masiva`
    );
  }

  @Get()
  @ApiOperation({ 
    summary: 'Obtener todos los posts', 
    description: 'Obtiene posts con límite opcional (máx 100 000). Sin parámetro devuelve hasta 100 000 registros.' 
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Máximo de registros a devolver (máx 100 000)', example: 50 })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Posts obtenidos exitosamente' 
  })
  async findAll(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const posts = await this.postsService.findAll(parsedLimit);
    return ApiResponse.success(posts, 'Posts obtenidos exitosamente');
  }

  @Get('paginated')
  @ApiOperation({ 
    summary: 'Obtener posts paginados', 
    description: 'Obtiene posts con paginación y filtros dinámicos por búsqueda, autor, ordenamiento' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Posts paginados obtenidos exitosamente' 
  })
  async getAllLimit(@Query(ValidationPipe) paginationDto: PaginationDto, @Query('author') author?: string) {
    const result = await this.postsService.getAllLimit(
      paginationDto.page,
      paginationDto.limit,
      paginationDto.search,
      author,
      paginationDto.sortBy || 'createdAt',
      paginationDto.sortOrder
    );
    return ApiResponse.success(result, 'Posts paginados obtenidos exitosamente');
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener post por ID', 
    description: 'Obtiene un post específico usando su ID único' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Post obtenido exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 404, 
    description: 'Post no encontrado' 
  })
  async findOne(@Param('id') id: string) {
    const post = await this.postsService.findOne(id);
    return ApiResponse.success(post, 'Post obtenido exitosamente');
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Actualizar post', 
    description: 'Actualiza un post existente con nuevos datos' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Post actualizado exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 404, 
    description: 'Post no encontrado' 
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updatePostDto: UpdatePostDto,
  ) {
    const post = await this.postsService.update(id, updatePostDto);
    return ApiResponse.success(post, 'Post actualizado exitosamente');
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar post', 
    description: 'Elimina un post permanentemente usando su ID' 
  })
  @SwaggerApiResponse({ 
    status: 204, 
    description: 'Post eliminado exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 404, 
    description: 'Post no encontrado' 
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.postsService.remove(id);
    return ApiResponse.success(null, 'Post eliminado exitosamente');
  }
}
