import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const createdComment = new this.commentModel(createCommentDto);
    return createdComment.save();
  }

  async findByPostId(postId: string): Promise<Comment[]> {
    return this.commentModel
      .find({ postId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAllLimit(
    page: number = 1, 
    limit: number = 10, 
    search?: string,
    name?: string,
    postId?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    
    // Construir filtro dinámico
    const filter: any = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    
    if (postId) {
      filter.postId = postId;
    }
    
    // Configurar ordenamiento
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Ejecutar consultas en paralelo para mejor performance
    const [data, total] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('postId name email body createdAt updatedAt') // Solo campos necesarios
        .exec(),
      this.commentModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    };
  }

  async remove(id: string): Promise<void> {
    const result = await this.commentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
  }
}
