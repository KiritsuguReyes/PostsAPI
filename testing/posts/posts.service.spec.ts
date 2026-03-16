import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PostsService } from '../../src/posts/posts.service';
import { Post } from '../../src/posts/schemas/post.schema';
import { RedisCacheService } from '../../src/common/cache/redis-cache.service';

const mockPost = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Test Post Title',
  body: 'Test post body content long enough',
  author: 'Test Author',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPostModel = {
  new: jest.fn().mockResolvedValue(mockPost),
  constructor: jest.fn().mockResolvedValue(mockPost),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn(),
  insertMany: jest.fn(),
  countDocuments: jest.fn(),
  save: jest.fn(),
  exec: jest.fn(),
};

const mockRedisCacheService = {
  getOrSet: jest.fn(),
  invalidateCollection: jest.fn().mockResolvedValue(undefined),
};

// Factory para crear instancias mock del modelo
function createMockModel() {
  const instance = {
    ...mockPost,
    save: jest.fn().mockResolvedValue(mockPost),
  };
  const ModelMock = jest.fn().mockImplementation(() => instance) as any;
  Object.assign(ModelMock, mockPostModel);
  return ModelMock;
}

describe('PostsService', () => {
  let service: PostsService;
  let model: any;

  beforeEach(async () => {
    model = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getModelToken(Post.name), useValue: model },
        { provide: RedisCacheService, useValue: mockRedisCacheService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should create a post and invalidate cache', async () => {
      const dto = { title: 'New Post', body: 'Body content here long enough', author: 'Author' };
      const savedPost = { ...dto, _id: 'newid', save: jest.fn().mockResolvedValue({ ...dto, _id: 'newid' }) };
      model.mockImplementation(() => savedPost);
      mockRedisCacheService.invalidateCollection.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('posts');
    });
  });

  describe('findAll()', () => {
    it('should return cached posts with default limit', async () => {
      const posts = [mockPost];
      mockRedisCacheService.getOrSet.mockResolvedValue(posts);

      const result = await service.findAll();

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'posts:all:100000',
        expect.any(Function),
        'posts',
      );
      expect(result).toEqual(posts);
    });

    it('should cap limit at 100_000', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue([]);

      await service.findAll(999999);

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'posts:all:100000',
        expect.any(Function),
        'posts',
      );
    });

    it('should respect custom limit', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue([]);

      await service.findAll(50);

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'posts:all:50',
        expect.any(Function),
        'posts',
      );
    });
  });

  describe('getAllLimit()', () => {
    it('should return paginated posts with default params', async () => {
      const paginatedResult = {
        data: [mockPost],
        pagination: { page: 1, limit: 10, total: 1, pages: 1, hasNextPage: false, hasPrevPage: false },
      };
      mockRedisCacheService.getOrSet.mockResolvedValue(paginatedResult);

      const result = await service.getAllLimit();

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalled();
      expect(result).toEqual(paginatedResult);
    });

    it('should build correct cache key with all filters', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue({});

      await service.getAllLimit(2, 5, 'Angular', 'title', 'asc');

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'posts:paginated:2:5:Angular:title:asc:',
        expect.any(Function),
        'posts',
      );
    });

    it('should correctly execute DB query inside cache miss', async () => {
      const data = [mockPost];
      const total = 1;
      const chainMock = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(data),
      };
      model.find = jest.fn().mockReturnValue(chainMock);
      model.countDocuments = jest.fn().mockResolvedValue(total);

      // Simula cache miss: ejecuta la factory
      mockRedisCacheService.getOrSet.mockImplementation(async (_key, factory) => factory());

      const result = await service.getAllLimit(1, 10);

      expect(result.data).toEqual(data);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.pages).toBe(1);
      expect(result.pagination.hasNextPage).toBe(false);
      expect(result.pagination.hasPrevPage).toBe(false);
    });

    it('should use $text search when search param provided', async () => {
      const chainMock = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      model.find = jest.fn().mockReturnValue(chainMock);
      model.countDocuments = jest.fn().mockResolvedValue(0);
      mockRedisCacheService.getOrSet.mockImplementation(async (_key, factory) => factory());

      await service.getAllLimit(1, 10, 'Angular');

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({ $text: { $search: 'Angular' } }),
      );
    });
  });

  describe('findOne()', () => {
    it('should return a cached post by id', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue(mockPost);

      const result = await service.findOne('507f1f77bcf86cd799439011');

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'posts:one:507f1f77bcf86cd799439011',
        expect.any(Function),
        'posts',
      );
      expect(result).toEqual(mockPost);
    });

    it('should throw NotFoundException when post not found (cache miss)', async () => {
      model.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });
      mockRedisCacheService.getOrSet.mockImplementation(async (_key, factory) => factory());

      await expect(service.findOne('nonexistentid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('should update post and invalidate cache', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedPost = { ...mockPost, ...updateDto };
      model.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPost),
      });

      const result = await service.update('507f1f77bcf86cd799439011', updateDto);

      expect(result).toEqual(updatedPost);
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('posts');
    });

    it('should throw NotFoundException when post not found', async () => {
      model.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('nonexistentid', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('should delete post and invalidate cache', async () => {
      model.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPost),
      });

      await service.remove('507f1f77bcf86cd799439011');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('posts');
    });

    it('should throw NotFoundException when post not found', async () => {
      model.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistentid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeBulk()', () => {
    it('should delete multiple posts and invalidate cache', async () => {
      model.deleteMany = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
      });

      const ids = ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'];
      const count = await service.removeBulk(ids);

      expect(model.deleteMany).toHaveBeenCalledWith({ _id: { $in: ids } });
      expect(count).toBe(2);
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('posts');
    });
  });

  describe('createBulk()', () => {
    it('should insert multiple posts and invalidate cache', async () => {
      const dtos = [
        { title: 'Post 1 Title', body: 'Body 1 content long', author: 'Author 1' },
        { title: 'Post 2 Title', body: 'Body 2 content long', author: 'Author 2' },
      ];
      const insertedPosts = dtos.map((d, i) => ({ ...d, _id: `id${i}` }));
      model.insertMany = jest.fn().mockResolvedValue(insertedPosts);

      const result = await service.createBulk(dtos);

      expect(model.insertMany).toHaveBeenCalledWith(dtos);
      expect(result).toEqual(insertedPosts);
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('posts');
    });
  });
});
