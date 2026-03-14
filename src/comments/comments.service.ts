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

  async remove(id: string): Promise<void> {
    const result = await this.commentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }
  }
}
