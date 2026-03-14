import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  title: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  body: string;

  @IsNotEmpty()
  @IsString()
  author: string;
}
