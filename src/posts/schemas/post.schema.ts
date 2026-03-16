import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PostDocument = Post & Document;

@Schema({
  timestamps: true,
})
export class Post {
  @Prop({ required: true, index: true, minlength: 3 })
  title: string;

  @Prop({ required: true, minlength: 10 })
  body: string;

  @Prop({ required: true, index: true })
  author: string;

  @Prop({ required: false, index: true })
  userId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Índice de texto compuesto para búsquedas eficientes en título, contenido y autor
PostSchema.index({ title: 'text', body: 'text', author: 'text' });
