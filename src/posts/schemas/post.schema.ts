import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({
  timestamps: true,
})
export class Post {
  @Prop({ required: true, index: true, minlength: 3 })
  title: string;

  @Prop({ required: true, text: true, minlength: 10 })
  body: string;

  @Prop({ required: true, index: true })
  author: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
