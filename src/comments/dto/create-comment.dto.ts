import { IsNotEmpty, IsString, IsEmail, MinLength, IsMongoId } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'El ID del post debe ser válido' })
  postId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(5, { message: 'El comentario debe tener al menos 5 caracteres' })
  body: string;
}
