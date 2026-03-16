import { IsNotEmpty, IsString, IsEmail, MinLength, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    description: 'ID del post al que pertenece el comentario',
    example: '65fd1234567890abcdef1234'
  })
  @IsMongoId({ message: 'El ID del post debe ser válido' })
  @IsNotEmpty()
  postId: string;

  @ApiProperty({
    description: 'Nombre del comentarista',
    example: 'Juan Pérez'
  })
  @IsString()
  @IsOptional()
  name: string;

  @ApiProperty({
    description: 'Email del comentarista',
    example: 'juan@test.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsOptional()
  email: string;

  @ApiProperty({
    description: 'Contenido del comentario',
    example: 'Excelente post, muy útil la información compartida!',
    minLength: 5
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'El comentario debe tener al menos 5 caracteres' })
  body: string;

  @ApiProperty({
    description: 'ID del usuario autenticado (se inyecta automáticamente desde el token)',
    required: false
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
