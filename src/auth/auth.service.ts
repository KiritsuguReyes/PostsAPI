import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;
    
    // Validar credenciales
    const user = await this.usersService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar payload JWT
    const payload = { 
      sub: (user as any)._id, 
      email: user.email,
      name: user.name,
      role: user.role 
    };

    // Generar token
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: (user as any)._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateToken(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }
}
