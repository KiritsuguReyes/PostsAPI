import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({
  timestamps: true,
})
export class Comment {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Post' })
  postId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, match: /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/ })
  email: string;

  @Prop({ required: true, minlength: 5 })
  body: string;

  createdAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
