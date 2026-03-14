import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { AuthService } from '../../../src/auth/auth.service';

const mockUser = {
  _id: '507f1f77bcf86cd799439033',
  email: 'user@example.com',
  name: 'Test User',
  active: true,
};

const mockAuthService = {
  validateToken: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test_jwt_secret_for_testing'),
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate()', () => {
    it('should return user when token is valid', async () => {
      const payload = { sub: '507f1f77bcf86cd799439033', email: 'user@example.com' };
      mockAuthService.validateToken.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(mockAuthService.validateToken).toHaveBeenCalledWith(payload);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when validateToken returns null', async () => {
      const payload = { sub: 'invalidid', email: 'bad@example.com' };
      mockAuthService.validateToken.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with message "Token inválido"', async () => {
      const payload = { sub: 'invalidid', email: 'bad@example.com' };
      mockAuthService.validateToken.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow('Token inválido');
    });
  });
});
