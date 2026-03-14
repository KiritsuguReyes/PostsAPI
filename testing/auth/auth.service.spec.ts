import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';

const mockUser = {
  _id: '507f1f77bcf86cd799439033',
  email: 'user@example.com',
  name: 'Test User',
  role: 'user',
  isActive: true,
};

const mockUsersService = {
  validateUser: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login()', () => {
    it('should return access_token and user on valid credentials', async () => {
      mockUsersService.validateUser.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock.jwt.token');

      const result = await service.login({ email: 'user@example.com', password: 'password' });

      expect(mockUsersService.validateUser).toHaveBeenCalledWith('user@example.com', 'password');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser._id, email: mockUser.email }),
      );
      expect(result.access_token).toBe('mock.jwt.token');
      expect(result.user).toMatchObject({ email: mockUser.email, name: mockUser.name });
    });

    it('should throw UnauthorizedException when validateUser returns null', async () => {
      mockUsersService.validateUser.mockResolvedValue(null);

      await expect(
        service.login({ email: 'bad@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken()', () => {
    it('should return user when found and active', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await service.validateToken({ sub: '507f1f77bcf86cd799439033', email: 'user@example.com' });

      expect(mockUsersService.findOne).toHaveBeenCalledWith('507f1f77bcf86cd799439033');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not active', async () => {
      mockUsersService.findOne.mockResolvedValue({ ...mockUser, isActive: false });

      const result = await service.validateToken({ sub: '507f1f77bcf86cd799439033', email: 'user@example.com' });

      expect(result).toBeNull();
    });

    it('should propagate exception when findOne throws (user not found)', async () => {
      mockUsersService.findOne.mockRejectedValue(new Error('Not found'));

      await expect(
        service.validateToken({ sub: 'badid', email: 'x@x.com' }),
      ).rejects.toThrow('Not found');
    });
  });
});
