import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../../src/users/users.controller';
import { UsersService } from '../../src/users/users.service';
import { ApiResponse } from '../../src/common/responses/api-response';

const mockUser = {
  _id: '507f1f77bcf86cd799439033',
  email: 'user@example.com',
  name: 'Test User',
  active: true,
};

const mockUsersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: typeof mockUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should create a user and return ApiResponse.success', async () => {
      const dto = { email: 'new@example.com', name: 'New User', password: 'password123' };
      const userObj = { email: 'new@example.com', name: 'New User', _id: 'uid' };
      const userWithToObject = { ...userObj, password: 'hashed', toObject: jest.fn().mockReturnValue({ ...userObj, password: 'hashed' }) };
      mockUsersService.create.mockResolvedValue(userWithToObject);

      const result = await controller.create(dto as any);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      // password must be stripped by the controller
      expect((result.data as any).password).toBeUndefined();
    });
  });

  describe('findAll()', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(users);
    });
  });

  describe('findOne()', () => {
    it('should return a single user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('507f1f77bcf86cd799439033');

      expect(service.findOne).toHaveBeenCalledWith('507f1f77bcf86cd799439033');
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(mockUser);
    });
  });

  describe('update()', () => {
    it('should update a user and return ApiResponse.success', async () => {
      const dto = { name: 'Updated Name' };
      const updated = { ...mockUser, name: 'Updated Name' };
      mockUsersService.update.mockResolvedValue(updated);

      const result = await controller.update('507f1f77bcf86cd799439033', dto as any);

      expect(service.update).toHaveBeenCalledWith('507f1f77bcf86cd799439033', dto);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect((result.data as any).name).toBe('Updated Name');
    });
  });
});
