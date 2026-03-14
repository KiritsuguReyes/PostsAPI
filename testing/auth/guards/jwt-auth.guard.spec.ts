import { JwtAuthGuard } from '../../../src/auth/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extend AuthGuard("jwt")', () => {
    const PassportJwtGuard = AuthGuard('jwt');
    expect(guard).toBeInstanceOf(PassportJwtGuard);
  });

  it('should be an instance of JwtAuthGuard', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });
});
