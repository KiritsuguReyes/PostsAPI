import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

export class UpdatePostDto {
  @ApiProperty({
    description: 'Título del post',
    example: 'Introducción a Angular 21 - Actualizado',
    minLength: 3,
    required: false
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  title?: string;

  @ApiProperty({
    description: 'Contenido del post',
    example: 'Angular 21 trae nuevas características increíbles como signals mejorados, mejor rendimiento y nueva sintaxis para componentes standalone...',
    minLength: 10,
    required: false
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'El contenido debe tener al menos 10 caracteres' })
  body?: string;

  @ApiProperty({
    description: 'Autor del post',
    example: 'Juan Pérez',
    required: false
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  author?: string;
}
