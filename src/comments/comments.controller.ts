import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApiResponse } from '../common/responses/api-response';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(ValidationPipe) createCommentDto: CreateCommentDto) {
    const comment = await this.commentsService.create(createCommentDto);
    return ApiResponse.success(comment, 'Comentario creado exitosamente');
  }

  @Get()
  async findByPostId(@Query('postId') postId: string) {
    if (!postId) {
      return ApiResponse.error('El parámetro postId es requerido', 400);
    }
    
    const comments = await this.commentsService.findByPostId(postId);
    return ApiResponse.success(comments, 'Comentarios obtenidos exitosamente');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.commentsService.remove(id);
    return ApiResponse.success(null, 'Comentario eliminado exitosamente');
  }
}
