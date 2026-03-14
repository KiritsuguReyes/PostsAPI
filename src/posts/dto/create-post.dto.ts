import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    description: 'Título del post',
    example: 'Introducción a Angular 21',
    minLength: 3
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  title: string;

  @ApiProperty({
    description: 'Contenido del post',
    example: 'Angular 21 trae nuevas características increíbles como signals mejorados...',
    minLength: 10
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  body: string;

  @ApiProperty({
    description: 'Autor del post',
    example: 'Juan Pérez'
  })
  @IsString()
  @IsNotEmpty()
  author: string;
}
