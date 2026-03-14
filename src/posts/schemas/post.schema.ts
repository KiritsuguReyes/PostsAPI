import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({
  timestamps: true,
})
export class Post {
  @Prop({ required: true, minlength: 3 })
  title: string;

  @Prop({ required: true, minlength: 10 })
  body: string;

  @Prop({ required: true })
  author: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);
