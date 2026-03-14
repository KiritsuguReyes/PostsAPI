import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisCacheService } from '../../../src/common/cache/redis-cache.service';

// Mock del cliente Redis (ioredis)
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  on: jest.fn(),
};

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedisClient),
  };
});

const mockConfigService = {
  get: jest.fn().mockReturnValue('redis://localhost:6379'),
};

describe('RedisCacheService', () => {
  let service: RedisCacheService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedisClient.connect.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isConnected()', () => {
    it('should return true when redis client status is ready', () => {
      (service as any).client.status = 'ready';
      const result = service.isConnected();
      expect(result).toBe(true);
    });

    it('should return false when redis client status is not ready', () => {
      (service as any).client.status = 'close';
      const result = service.isConnected();
      expect(result).toBe(false);
    });
  });

  describe('getLastModified()', () => {
    it('should return 0 when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getLastModified('posts');

      expect(mockRedisClient.get).toHaveBeenCalledWith('_lm:posts');
      expect(result).toBe(0);
    });

    it('should return parsed timestamp when key exists', async () => {
      const ts = Date.now();
      mockRedisClient.get.mockResolvedValue(ts.toString());

      const result = await service.getLastModified('posts');

      expect(result).toBe(ts);
    });

    it('should return 0 when Redis throws an error', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getLastModified('posts');

      expect(result).toBe(0);
    });
  });

  describe('touchLastModified()', () => {
    it('should set _lm:{collection} with 1h TTL', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.touchLastModified('posts');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        '_lm:posts',
        expect.any(String),
        'EX',
        3600,
      );
    });

    it('should not throw when Redis errors', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis down'));

      await expect(service.touchLastModified('posts')).resolves.not.toThrow();
    });
  });

  describe('getOrSet()', () => {
    const factory = jest.fn();

    it('should return cached data on cache hit with fresh cachedAt', async () => {
      const now = Date.now();
      const cachedEntry = JSON.stringify({ data: { id: 1 }, cachedAt: now + 1000 });
      mockRedisClient.get
        .mockResolvedValueOnce(cachedEntry)   // key data
        .mockResolvedValueOnce(String(now));  // _lm:collection

      factory.mockResolvedValue({ id: 2 });

      const result = await service.getOrSet('posts:all', factory, 'posts');

      expect(factory).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('should call factory and store result on cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      factory.mockResolvedValue({ id: 99 });

      const result = await service.getOrSet('posts:all', factory, 'posts');

      expect(factory).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'posts:all',
        expect.stringContaining('"id":99'),
        'EX',
        30,
      );
      expect(result).toEqual({ id: 99 });
    });

    it('should call factory and store result when cache is stale (cachedAt < lastModified)', async () => {
      const now = Date.now();
      const staleEntry = JSON.stringify({ data: { id: 1 }, cachedAt: now - 5000 });
      mockRedisClient.get
        .mockResolvedValueOnce(staleEntry)
        .mockResolvedValueOnce(String(now)); // lastModified > cachedAt
      mockRedisClient.set.mockResolvedValue('OK');
      factory.mockResolvedValue({ id: 2 });

      const result = await service.getOrSet('posts:all', factory, 'posts');

      expect(factory).toHaveBeenCalled();
      expect(result).toEqual({ id: 2 });
    });

    it('should fall back to factory when Redis throws', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis down'));
      factory.mockResolvedValue({ id: 42 });

      const result = await service.getOrSet('posts:all', factory, 'posts');

      expect(factory).toHaveBeenCalled();
      expect(result).toEqual({ id: 42 });
    });
  });

  describe('deletePattern()', () => {
    it('should SCAN and delete matching keys', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['0', ['posts:one:id1', 'posts:all']]);
      mockRedisClient.del.mockResolvedValue(2);

      await service.deletePattern('posts:*');

      expect(mockRedisClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'posts:*', 'COUNT', 100);
      expect(mockRedisClient.del).toHaveBeenCalledWith('posts:one:id1', 'posts:all');
    });

    it('should handle multiple SCAN pages (cursor != 0 then 0)', async () => {
      mockRedisClient.scan
        .mockResolvedValueOnce(['42', ['posts:one:a']])
        .mockResolvedValueOnce(['0', ['posts:one:b']]);
      mockRedisClient.del.mockResolvedValue(1);

      await service.deletePattern('posts:*');

      expect(mockRedisClient.scan).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.del).toHaveBeenCalledTimes(2);
    });

    it('should not throw when no keys match', async () => {
      mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

      await expect(service.deletePattern('posts:nonexistent:*')).resolves.not.toThrow();
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should not throw when Redis scan fails', async () => {
      mockRedisClient.scan.mockRejectedValue(new Error('Redis error'));

      await expect(service.deletePattern('posts:*')).resolves.not.toThrow();
    });
  });

  describe('invalidateCollection()', () => {
    it('should call touchLastModified and deletePattern', async () => {
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.scan.mockResolvedValueOnce(['0', ['posts:all']]);
      mockRedisClient.del.mockResolvedValue(1);

      await service.invalidateCollection('posts');

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        '_lm:posts',
        expect.any(String),
        'EX',
        3600,
      );
      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0', 'MATCH', 'posts:*', 'COUNT', 100,
      );
    });
  });

  describe('onModuleDestroy()', () => {
    it('should disconnect the Redis client', () => {
      mockRedisClient.disconnect.mockReturnValue(undefined);

      service.onModuleDestroy();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });
  });
});
