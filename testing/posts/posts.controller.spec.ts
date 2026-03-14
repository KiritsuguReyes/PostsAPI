import { Test, TestingModule } from '@nestjs/testing';
import { PostsController } from '../../src/posts/posts.controller';
import { PostsService } from '../../src/posts/posts.service';
import { ApiResponse } from '../../src/common/responses/api-response';

const mockReq = {
  user: { _id: 'user123', name: 'Test User', email: 'test@test.com', role: 'user' },
} as any;

const mockPost = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Test Post Title',
  body: 'Test post body content',
  author: 'Test Author',
};

const mockPostsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  getAllLimit: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  createBulk: jest.fn(),
};

describe('PostsController', () => {
  let controller: PostsController;
  let service: typeof mockPostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [{ provide: PostsService, useValue: mockPostsService }],
    }).compile();

    controller = module.get<PostsController>(PostsController);
    service = module.get(PostsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should create a post and return ApiResponse.success', async () => {
      const dto = { title: 'New Post', body: 'Body content here', author: 'Author' };
      mockPostsService.create.mockResolvedValue({ ...dto, _id: 'newid', userId: 'user123' });

      const result = await controller.create(mockReq, dto as any);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Post', body: 'Body content here', author: 'Author', userId: 'user123' }),
      );
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(dto);
    });

    it('should fill author from claims when not provided in dto', async () => {
      const dto = { title: 'New Post', body: 'Body content here', author: '' };
      mockPostsService.create.mockResolvedValue({ ...dto, _id: 'newid' });

      await controller.create(mockReq, dto as any);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'Test User', userId: 'user123' }),
      );
    });

    it('should inject userId from request even when author is present', async () => {
      const dto = { title: 'My Post', body: 'Body content here', author: 'Custom Author' };
      mockPostsService.create.mockResolvedValue({ ...dto, _id: 'newid' });

      await controller.create(mockReq, dto as any);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user123', author: 'Custom Author' }),
      );
    });
  });

  describe('createBulk()', () => {
    it('should create multiple posts and return ApiResponse.success', async () => {
      const dtos = [
        { title: 'Post 1', body: 'Body 1 long enough', author: 'Author 1' },
        { title: 'Post 2', body: 'Body 2 long enough', author: 'Author 2' },
      ];
      const created = dtos.map((d, i) => ({ ...d, _id: `id${i}` }));
      mockPostsService.createBulk.mockResolvedValue(created);

      const result = await controller.createBulk(dtos as any);

      expect(service.createBulk).toHaveBeenCalledWith(dtos);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(created);
    });
  });

  describe('findAll()', () => {
    it('should return all posts', async () => {
      const posts = [mockPost];
      mockPostsService.findAll.mockResolvedValue(posts);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(posts);
    });
  });

  describe('getAllLimit() - GET /paginated', () => {
    it('should return paginated posts with pagination query', async () => {
      const paginatedResult = {
        data: [mockPost],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      mockPostsService.getAllLimit.mockResolvedValue(paginatedResult);

      const paginationDto = { page: 1, limit: 10, search: undefined, sortBy: undefined, sortOrder: undefined } as any;
      const author = undefined;
      const result = await controller.getAllLimit(paginationDto, author);

      expect(service.getAllLimit).toHaveBeenCalledWith(
        paginationDto.page,
        paginationDto.limit,
        paginationDto.search,
        author,
        'createdAt',
        paginationDto.sortOrder,
      );
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(paginatedResult);
    });

    it('should pass author filter when provided', async () => {
      mockPostsService.getAllLimit.mockResolvedValue({});

      const paginationDto = { page: 1, limit: 10, sortBy: 'title' } as any;
      await controller.getAllLimit(paginationDto, 'Juan');

      expect(service.getAllLimit).toHaveBeenCalledWith(
        1, 10, undefined, 'Juan', 'title', undefined,
      );
    });
  });

  describe('findOne()', () => {
    it('should return a single post', async () => {
      mockPostsService.findOne.mockResolvedValue(mockPost);

      const result = await controller.findOne('507f1f77bcf86cd799439011');

      expect(service.findOne).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(mockPost);
    });
  });

  describe('update()', () => {
    it('should update a post and return ApiResponse.success', async () => {
      const updateDto = { title: 'Updated Title' };
      const updatedPost = { ...mockPost, ...updateDto };
      mockPostsService.update.mockResolvedValue(updatedPost);

      const result = await controller.update('507f1f77bcf86cd799439011', updateDto as any);

      expect(service.update).toHaveBeenCalledWith('507f1f77bcf86cd799439011', updateDto);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(updatedPost);
    });
  });

  describe('remove()', () => {
    it('should delete a post and return ApiResponse.success', async () => {
      mockPostsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('507f1f77bcf86cd799439011');

      expect(service.remove).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
    });
  });
});
