import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'alvaro@test.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: '12356789',
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
      email: 'alvaro@test.com',
      name: 'Alvaro Reyes',
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
