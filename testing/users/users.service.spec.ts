import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../../src/users/users.service';
import { User } from '../../src/users/schemas/user.schema';
import { RedisCacheService } from '../../src/common/cache/redis-cache.service';

const mockUser = {
  _id: '507f1f77bcf86cd799439033',
  email: 'user@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  active: true,
  comparePassword: jest.fn(),
};

const mockRedisCacheService = {
  getOrSet: jest.fn(),
  invalidateCollection: jest.fn().mockResolvedValue(undefined),
};

function createMockUserModel() {
  const instance = { ...mockUser, save: jest.fn().mockResolvedValue(mockUser) };
  const ModelMock = jest.fn().mockImplementation(() => instance) as any;
  ModelMock.find = jest.fn();
  ModelMock.findById = jest.fn();
  ModelMock.findOne = jest.fn();
  return ModelMock;
}

describe('UsersService', () => {
  let service: UsersService;
  let model: any;

  beforeEach(async () => {
    model = createMockUserModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: model },
        { provide: RedisCacheService, useValue: mockRedisCacheService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should create a user successfully', async () => {
      const dto = { email: 'new@example.com', name: 'New User', password: 'pass123' };
      const savedUser = { ...dto, _id: 'uid', save: jest.fn().mockResolvedValue({ ...dto, _id: 'uid' }) };
      model.mockImplementation(() => savedUser);

      const result = await service.create(dto);

      expect(result).toBeDefined();
    });

    it('should throw ConflictException on duplicate email (error code 11000)', async () => {
      const dto = { email: 'existing@example.com', name: 'User', password: 'pass123' };
      const duplicateError = { code: 11000 };
      const failInstance = {
        ...dto,
        save: jest.fn().mockRejectedValue(duplicateError),
      };
      model.mockImplementation(() => failInstance);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should rethrow unexpected errors', async () => {
      const dto = { email: 'new@example.com', name: 'User', password: 'pass123' };
      const unexpectedError = new Error('Unexpected DB error');
      const failInstance = {
        ...dto,
        save: jest.fn().mockRejectedValue(unexpectedError),
      };
      model.mockImplementation(() => failInstance);

      await expect(service.create(dto)).rejects.toThrow('Unexpected DB error');
    });
  });

  describe('findAll()', () => {
    it('should return all users with default limit', async () => {
      const users = [mockUser];
      mockRedisCacheService.getOrSet.mockResolvedValue(users);

      const result = await service.findAll();

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'users:all:100000',
        expect.any(Function),
        'users',
      );
      expect(result).toEqual(users);
    });

    it('should respect custom limit', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue([]);

      await service.findAll(5);

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'users:all:5',
        expect.any(Function),
        'users',
      );
    });

    it('should call DB with chain select-sort-limit on cache miss', async () => {
      const chainMock = {
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockUser]),
      };
      model.find = jest.fn().mockReturnValue(chainMock);
      mockRedisCacheService.getOrSet.mockImplementation(async (_k, factory) => factory());

      const result = await service.findAll();

      expect(model.find).toHaveBeenCalled();
      expect(chainMock.select).toHaveBeenCalledWith('-password');
      expect(result).toEqual([mockUser]);
    });
  });

  describe('findOne()', () => {
    it('should return user by id from cache', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue(mockUser);

      const result = await service.findOne('507f1f77bcf86cd799439033');

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'users:one:507f1f77bcf86cd799439033',
        expect.any(Function),
        'users',
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found (cache miss)', async () => {
      model.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });
      mockRedisCacheService.getOrSet.mockImplementation(async (_k, factory) => factory());

      await expect(service.findOne('nonexistentid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail()', () => {
    it('should return user by email', async () => {
      model.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.findByEmail('user@example.com');

      expect(model.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
      expect(result).toEqual(mockUser);
    });

    it('should return null when email not found', async () => {
      model.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  describe('validateUser()', () => {
    it('should return user without password on valid credentials', async () => {
      const plainUserObj = { _id: 'uid', email: 'user@example.com', name: 'Test', role: 'user' };
      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({ ...plainUserObj, password: 'hash' }),
      };
      model.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithCompare),
      });

      const result = await service.validateUser('user@example.com', 'plainpassword');

      expect(result).toBeDefined();
      expect(result!['password']).toBeUndefined();
    });

    it('should return null when email not found', async () => {
      model.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.validateUser('wrong@example.com', 'pass');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      const userWithBadPass = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      model.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(userWithBadPass),
      });

      const result = await service.validateUser('user@example.com', 'wrongpass');

      expect(result).toBeNull();
    });
  });
});
