import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({
    description: 'Nombre del comentarista',
    example: 'Juan Pérez Actualizado',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email del comentarista', 
    example: 'juan.actualizado@test.com',
    required: false
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Contenido actualizado del comentario',
    example: 'Este es mi comentario actualizado sobre el post...',
    minLength: 5,
    required: false
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  body?: string;
}
