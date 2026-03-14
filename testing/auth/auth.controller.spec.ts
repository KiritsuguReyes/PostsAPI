import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { ApiResponse } from '../../src/common/responses/api-response';

const mockAuthResult = {
  access_token: 'mock.jwt.token',
  user: {
    _id: '507f1f77bcf86cd799439033',
    email: 'user@example.com',
    name: 'Test User',
    active: true,
  },
};

const mockAuthService = {
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let service: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login()', () => {
    it('should login and return ApiResponse.success with token and user', async () => {
      mockAuthService.login.mockResolvedValue(mockAuthResult);
      const dto = { email: 'user@example.com', password: 'password' };

      const result = await controller.login(dto as any);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAuthResult);
    });

    it('should propagate errors from auth service', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        controller.login({ email: 'bad@example.com', password: 'wrong' } as any),
      ).rejects.toThrow('Unauthorized');
    });
  });
});
