import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@test.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'Token JWT para autenticación',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  access_token: string;

  @ApiProperty({
    description: 'Información del usuario autenticado',
    example: {
      id: '65fd1234567890abcdef1234',
      email: 'usuario@test.com',
      name: 'Juan Pérez',
      role: 'user'
    }
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
