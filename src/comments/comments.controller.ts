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
  Req,
} from '@nestjs/common';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ApiResponse } from '../common/responses/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtClaimsUtil } from '../common/utils/jwt-claims.util';

@ApiTags('Comments')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'comments', version: '1' })
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Crear nuevo comentario', 
    description: 'Crea un comentario en un post específico' 
  })
  @SwaggerApiResponse({ 
    status: 201, 
    description: 'Comentario creado exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 429, 
    description: 'Demasiados comentarios creados' 
  })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 4, ttl: 30000 } }) // 4 comentarios por 30 segundos
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: Request, @Body(ValidationPipe) createCommentDto: CreateCommentDto) {
    const userId = JwtClaimsUtil.getUserId(req);
    const name   = JwtClaimsUtil.getName(req);
    const email  = JwtClaimsUtil.getUserEmail(req);
    if (userId) createCommentDto.userId = userId;
    if (name && !createCommentDto.name) createCommentDto.name = name;
    if (email && !createCommentDto.email) createCommentDto.email = email;
    const comment = await this.commentsService.create(createCommentDto);
    return ApiResponse.success(comment, 'Comentario creado exitosamente');
  }

  @Get()
  @ApiOperation({ 
    summary: 'Obtener todos los comentarios de un post', 
    description: 'Obtiene todos los comentarios que pertenecen a un post específico usando el postId como query parameter' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Comentarios del post obtenidos exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 400, 
    description: 'Parámetro postId es requerido' 
  })
  async findByPostId(@Query('postId') postId: string) {
    if (!postId) {
      return ApiResponse.error('El parámetro postId es requerido', 400);
    }
    
    const comments = await this.commentsService.findByPostId(postId);
    return ApiResponse.success(comments, 'Comentarios obtenidos exitosamente');
  }

  @Get('paginated')
  @ApiOperation({ 
    summary: 'Obtener comentarios paginados', 
    description: 'Obtiene comentarios con paginación y filtros dinámicos por búsqueda y postId opcional' 
  })
  @ApiQuery({
    name: 'postId',
    required: false,
    description: 'ID del post para filtrar comentarios específicos',
    example: '507f1f77bcf86cd799439011'
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Comentarios paginados obtenidos exitosamente' 
  })
  async getAllLimit(
    @Query() query: any,
    @Query('postId') postId?: string
  ) {
    // Validar manualmente solo los parámetros de paginación
    const paginationDto = new PaginationDto();
    paginationDto.page = query.page ? parseInt(query.page) : 1;
    paginationDto.limit = query.limit ? parseInt(query.limit) : 10;
    paginationDto.search = query.search;
    paginationDto.sortBy = query.sortBy || 'createdAt';
    paginationDto.sortOrder = query.sortOrder || 'desc';
    const result = await this.commentsService.getAllLimit(
      paginationDto.page,
      paginationDto.limit,
      paginationDto.search,
      postId,
      paginationDto.sortBy || 'createdAt',
      paginationDto.sortOrder
    );
    return ApiResponse.success(result, 'Comentarios paginados obtenidos exitosamente');
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener comentario por ID', 
    description: 'Obtiene un comentario específico por su ID' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Comentario obtenido exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 404, 
    description: 'Comentario no encontrado' 
  })
  async findOne(@Param('id') id: string) {
    const comment = await this.commentsService.findOne(id);
    return ApiResponse.success(comment, 'Comentario obtenido exitosamente');
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Actualizar comentario', 
    description: 'Actualiza un comentario existente por su ID' 
  })
  @SwaggerApiResponse({ 
    status: 200, 
    description: 'Comentario actualizado exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 404, 
    description: 'Comentario no encontrado' 
  })
  async update(@Param('id') id: string, @Body(ValidationPipe) updateCommentDto: UpdateCommentDto) {
    const comment = await this.commentsService.update(id, updateCommentDto);
    return ApiResponse.success(comment, 'Comentario actualizado exitosamente');
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar comentario', 
    description: 'Elimina un comentario por su ID' 
  })
  @SwaggerApiResponse({ 
    status: 204, 
    description: 'Comentario eliminado exitosamente' 
  })
  @SwaggerApiResponse({ 
    status: 404, 
    description: 'Comentario no encontrado' 
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.commentsService.remove(id);
    return ApiResponse.success(null, 'Comentario eliminado exitosamente');
  }
}
