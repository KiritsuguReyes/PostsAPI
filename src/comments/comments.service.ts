import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { RedisCacheService } from '../common/cache/redis-cache.service';

const COLLECTION = 'comments';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private readonly cache: RedisCacheService,
  ) {}

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const createdComment = new this.commentModel(createCommentDto);
    const result = await createdComment.save();
    await this.cache.invalidateCollection(COLLECTION);
    return result;
  }

  async findByPostId(postId: string): Promise<Comment[]> {
    const key = `${COLLECTION}:by-post:${postId}`;
    return this.cache.getOrSet(
      key,
      () => this.commentModel.find({ postId }).sort({ createdAt: -1 }).exec(),
      COLLECTION,
    );
  }

  async getAllLimit(
    page: number = 1, 
    limit: number = 10, 
    search?: string,
    postId?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    const skip = (page - 1) * limit;
    
    // Construir filtro dinámico
    const filter: any = {};
    
    if (search) {
      // Usa el índice de texto compuesto (name + body) para rendimiento óptimo
      filter.$text = { $search: search };
    }
    
    if (postId) {
      filter.postId = postId;
    }
    
    // Configurar ordenamiento
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    const key = `${COLLECTION}:paginated:${page}:${limit}:${search ?? ''}:${name ?? ''}:${postId ?? ''}:${sortBy}:${sortOrder}`;

    return this.cache.getOrSet(
      key,
      async () => {
        const [data, total] = await Promise.all([
          this.commentModel
            .find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('postId name email body createdAt updatedAt')
            .exec(),
          this.commentModel.countDocuments(filter),
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
          },
        };
      },
      COLLECTION,
    );
  }

  async findOne(id: string): Promise<Comment> {
    const key = `${COLLECTION}:one:${id}`;
    return this.cache.getOrSet(
      key,
      async () => {
        const comment = await this.commentModel.findById(id).exec();
        if (!comment) throw new NotFoundException(`Comment with ID ${id} not found`);
        return comment;
      },
      COLLECTION,
    );
  }

  async update(id: string, updateCommentDto: UpdateCommentDto): Promise<Comment> {
    const updatedComment = await this.commentModel
      .findByIdAndUpdate(id, updateCommentDto, { new: true })
      .exec();

    if (!updatedComment) throw new NotFoundException(`Comment with ID ${id} not found`);
    await this.cache.invalidateCollection(COLLECTION);
    return updatedComment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.commentModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Comment with ID ${id} not found`);
    await this.cache.invalidateCollection(COLLECTION);
  }
}
