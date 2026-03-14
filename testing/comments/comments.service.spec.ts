import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { CommentsService } from '../../src/comments/comments.service';
import { Comment } from '../../src/comments/schemas/comment.schema';
import { RedisCacheService } from '../../src/common/cache/redis-cache.service';

const mockComment = {
  _id: '507f1f77bcf86cd799439022',
  postId: '507f1f77bcf86cd799439011',
  name: 'Reviewer',
  email: 'reviewer@example.com',
  body: 'Great post body!',
};

const mockRedisCacheService = {
  getOrSet: jest.fn(),
  invalidateCollection: jest.fn().mockResolvedValue(undefined),
};

function createMockCommentModel() {
  const instance = { ...mockComment, save: jest.fn().mockResolvedValue(mockComment) };
  const ModelMock = jest.fn().mockImplementation(() => instance) as any;
  ModelMock.find = jest.fn();
  ModelMock.findById = jest.fn();
  ModelMock.findByIdAndUpdate = jest.fn();
  ModelMock.findByIdAndDelete = jest.fn();
  ModelMock.countDocuments = jest.fn();
  return ModelMock;
}

describe('CommentsService', () => {
  let service: CommentsService;
  let model: any;

  beforeEach(async () => {
    model = createMockCommentModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: getModelToken(Comment.name), useValue: model },
        { provide: RedisCacheService, useValue: mockRedisCacheService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should create a comment and invalidate cache', async () => {
      const dto = {
        postId: '507f1f77bcf86cd799439011',
        name: 'Tester',
        email: 'test@test.com',
        body: 'A valid comment',
      };
      const savedComment = { ...dto, _id: 'cid', save: jest.fn().mockResolvedValue({ ...dto, _id: 'cid' }) };
      model.mockImplementation(() => savedComment);
      mockRedisCacheService.invalidateCollection.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('comments');
    });
  });

  describe('findByPostId()', () => {
    it('should return cached comments for a post', async () => {
      const comments = [mockComment];
      mockRedisCacheService.getOrSet.mockResolvedValue(comments);

      const result = await service.findByPostId('507f1f77bcf86cd799439011');

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'comments:by-post:507f1f77bcf86cd799439011',
        expect.any(Function),
        'comments',
      );
      expect(result).toEqual(comments);
    });

    it('should query DB on cache miss', async () => {
      const chainMock = { find: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([mockComment]) };
      model.find = jest.fn().mockReturnValue(chainMock);
      mockRedisCacheService.getOrSet.mockImplementation(async (_key, factory) => factory());

      const result = await service.findByPostId('507f1f77bcf86cd799439011');

      expect(model.find).toHaveBeenCalledWith({ postId: '507f1f77bcf86cd799439011' });
      expect(result).toEqual([mockComment]);
    });
  });

  describe('getAllLimit()', () => {
    it('should return paginated comments', async () => {
      const paginatedResult = {
        data: [mockComment],
        pagination: { page: 1, limit: 10, total: 1, pages: 1, hasNextPage: false, hasPrevPage: false },
      };
      mockRedisCacheService.getOrSet.mockResolvedValue(paginatedResult);

      const result = await service.getAllLimit();

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalled();
      expect(result).toEqual(paginatedResult);
    });

    it('should include postId filter in cache key when provided', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue({});

      await service.getAllLimit(1, 10, '', '', '507f1f77bcf86cd799439011');

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        expect.stringContaining('507f1f77bcf86cd799439011'),
        expect.any(Function),
        'comments',
      );
    });

    it('should execute DB query on cache miss with filters', async () => {
      const chainMock = {
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockComment]),
      };
      model.find = jest.fn().mockReturnValue(chainMock);
      model.countDocuments = jest.fn().mockResolvedValue(1);
      mockRedisCacheService.getOrSet.mockImplementation(async (_key, factory) => factory());

      const postId = '507f1f77bcf86cd799439011';
      const result = await service.getAllLimit(1, 10, '', postId);

      expect(result.data).toEqual([mockComment]);
      expect(model.find).toHaveBeenCalledWith(expect.objectContaining({ postId }));
    });
  });

  describe('findOne()', () => {
    it('should return a cached comment', async () => {
      mockRedisCacheService.getOrSet.mockResolvedValue(mockComment);

      const result = await service.findOne('507f1f77bcf86cd799439022');

      expect(mockRedisCacheService.getOrSet).toHaveBeenCalledWith(
        'comments:one:507f1f77bcf86cd799439022',
        expect.any(Function),
        'comments',
      );
      expect(result).toEqual(mockComment);
    });

    it('should throw NotFoundException when comment not found (cache miss)', async () => {
      model.findById = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockRedisCacheService.getOrSet.mockImplementation(async (_key, factory) => factory());

      await expect(service.findOne('nonexistentid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update()', () => {
    it('should update comment and invalidate cache', async () => {
      const updateDto = { body: 'Updated body content' };
      const updatedComment = { ...mockComment, ...updateDto };
      model.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedComment),
      });

      const result = await service.update('507f1f77bcf86cd799439022', updateDto);

      expect(result).toEqual(updatedComment);
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('comments');
    });

    it('should throw NotFoundException when comment not found', async () => {
      model.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.update('nonexistentid', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('should delete comment and invalidate cache', async () => {
      model.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockComment),
      });

      await service.remove('507f1f77bcf86cd799439022');

      expect(model.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439022');
      expect(mockRedisCacheService.invalidateCollection).toHaveBeenCalledWith('comments');
    });

    it('should throw NotFoundException when comment not found', async () => {
      model.findByIdAndDelete = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.remove('nonexistentid')).rejects.toThrow(NotFoundException);
    });
  });
});
