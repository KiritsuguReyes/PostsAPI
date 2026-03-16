import { Test, TestingModule } from '@nestjs/testing';
import { CommentsController } from '../../src/comments/comments.controller';
import { CommentsService } from '../../src/comments/comments.service';
import { ApiResponse } from '../../src/common/responses/api-response';

const mockReq = {
  user: { _id: 'user123', name: 'Test User', email: 'test@test.com', role: 'user' },
} as any;

const mockComment = {
  _id: '507f1f77bcf86cd799439022',
  postId: '507f1f77bcf86cd799439011',
  name: 'Reviewer',
  email: 'reviewer@example.com',
  body: 'Great post body!',
};

const mockCommentsService = {
  create: jest.fn(),
  findByPostId: jest.fn(),
  getAllLimit: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CommentsController', () => {
  let controller: CommentsController;
  let service: typeof mockCommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [{ provide: CommentsService, useValue: mockCommentsService }],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get(CommentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create()', () => {
    it('should create a comment and return ApiResponse.success', async () => {
      const dto = {
        postId: '507f1f77bcf86cd799439011',
        name: 'Tester',
        email: 'test@test.com',
        body: 'A valid comment',
      };
      mockCommentsService.create.mockResolvedValue({ ...dto, _id: 'cid', userId: 'user123' });

      const result = await controller.create(mockReq, dto as any);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ ...dto, userId: 'user123' }),
      );
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
    });

    it('should inject userId, name and email from claims when provided', async () => {
      const dto = {
        postId: '507f1f77bcf86cd799439011',
        name: '',
        email: '',
        body: 'A valid comment',
      };
      mockCommentsService.create.mockResolvedValue({ ...dto, _id: 'cid' });

      await controller.create(mockReq, dto as any);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user123', name: 'Test User', email: 'test@test.com' }),
      );
    });
  });

  describe('findByPostId()', () => {
    it('should return comments for a post', async () => {
      const comments = [mockComment];
      mockCommentsService.findByPostId.mockResolvedValue(comments);

      const result = await controller.findByPostId('507f1f77bcf86cd799439011');

      expect(service.findByPostId).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(comments);
    });

    it('should return error response when postId is not provided', async () => {
      const result = await controller.findByPostId(undefined as any);

      expect(service.findByPostId).not.toHaveBeenCalled();
      expect(result).toBeInstanceOf(ApiResponse);
      expect((result as any).success).toBe(false);
    });
  });

  describe('getAllLimit() - GET /paginated', () => {
    it('should return paginated comments', async () => {
      const paginatedResult = {
        data: [mockComment],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      };
      mockCommentsService.getAllLimit.mockResolvedValue(paginatedResult);

      const paginationDto = { page: 1, limit: 10, search: undefined, sortBy: undefined, sortOrder: undefined } as any;
      const result = await controller.getAllLimit(paginationDto, undefined);

      expect(service.getAllLimit).toHaveBeenCalledWith(
        paginationDto.page,
        paginationDto.limit,
        paginationDto.search,
        undefined,
        'createdAt',
        'desc',
      );
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(paginatedResult);
    });

    it('should pass postId filter when provided', async () => {
      mockCommentsService.getAllLimit.mockResolvedValue({});

      const paginationDto = { page: 1, limit: 5, sortBy: 'createdAt' } as any;
      await controller.getAllLimit(paginationDto, '507f1f77bcf86cd799439011');

      expect(service.getAllLimit).toHaveBeenCalledWith(
        1, 5, undefined, '507f1f77bcf86cd799439011', 'createdAt', 'desc',
      );
    });
  });

  describe('findOne()', () => {
    it('should return a single comment', async () => {
      mockCommentsService.findOne.mockResolvedValue(mockComment);

      const result = await controller.findOne('507f1f77bcf86cd799439022');

      expect(service.findOne).toHaveBeenCalledWith('507f1f77bcf86cd799439022');
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(mockComment);
    });
  });

  describe('update()', () => {
    it('should update a comment and return ApiResponse.success', async () => {
      const updateDto = { body: 'Updated comment body' };
      const updated = { ...mockComment, ...updateDto };
      mockCommentsService.update.mockResolvedValue(updated);

      const result = await controller.update('507f1f77bcf86cd799439022', updateDto as any);

      expect(service.update).toHaveBeenCalledWith('507f1f77bcf86cd799439022', updateDto);
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.data).toEqual(updated);
    });
  });

  describe('remove()', () => {
    it('should delete a comment and return ApiResponse.success', async () => {
      mockCommentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('507f1f77bcf86cd799439022');

      expect(service.remove).toHaveBeenCalledWith('507f1f77bcf86cd799439022');
      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
    });
  });
});
