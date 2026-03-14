import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { HealthController } from '../../../src/common/health/health.controller';
import { RedisCacheService } from '../../../src/common/cache/redis-cache.service';
import { ApiResponse } from '../../../src/common/responses/api-response';

const mockMongoConnection = {
  readyState: 1, // 1 = connected
};

const mockRedisCacheService = {
  isConnected: jest.fn().mockReturnValue(true),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: getConnectionToken(), useValue: mockMongoConnection },
        { provide: RedisCacheService, useValue: mockRedisCacheService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check() - GET /health', () => {
    it('should return status "ok" when MongoDB and Redis are healthy', async () => {
      mockMongoConnection.readyState = 1;
      mockRedisCacheService.isConnected.mockReturnValue(true);

      const result = await controller.check();

      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Health check exitoso');
      expect(result.data.status).toBe('ok');
    });

    it('should return status "degraded" when MongoDB is disconnected', async () => {
      mockMongoConnection.readyState = 0; // disconnected
      mockRedisCacheService.isConnected.mockReturnValue(true);

      const result = await controller.check();

      expect(result.data.status).toBe('degraded');
      expect(result.message).toContain('base de datos no disponible');
    });

    it('should return status "degraded" when Redis is disconnected', async () => {
      mockMongoConnection.readyState = 1;
      mockRedisCacheService.isConnected.mockReturnValue(false);

      const result = await controller.check();

      expect(result.data.status).toBe('degraded');
      expect(result.message).toContain('cache no disponible');
    });

    it('should return status "degraded" when both MongoDB and Redis are down', async () => {
      mockMongoConnection.readyState = 0;
      mockRedisCacheService.isConnected.mockReturnValue(false);

      const result = await controller.check();

      expect(result.data.status).toBe('degraded');
    });

    it('should include database state in health data', async () => {
      mockMongoConnection.readyState = 1;
      mockRedisCacheService.isConnected.mockReturnValue(true);

      const result = await controller.check();

      expect(result.data).toHaveProperty('database');
      expect(result.data.database.healthy).toBe(true);
      expect(result.data.database.status).toBe('connected');
    });

    it('should include cache state in health data', async () => {
      mockMongoConnection.readyState = 1;
      mockRedisCacheService.isConnected.mockReturnValue(true);

      const result = await controller.check();

      expect(result.data).toHaveProperty('cache');
      expect(result.data.cache.healthy).toBe(true);
      expect(result.data.cache.status).toBe('connected');
    });

    it('should include uptime, memory and environment in response', async () => {
      mockMongoConnection.readyState = 1;
      mockRedisCacheService.isConnected.mockReturnValue(true);

      const result = await controller.check();

      expect(result.data).toHaveProperty('uptime');
      expect(result.data).toHaveProperty('memory');
      expect(result.data).toHaveProperty('environment');
      expect(result.data).toHaveProperty('timestamp');
    });
  });

  describe('ping() - GET /health/ping', () => {
    it('should return pong response', () => {
      const result = controller.ping();

      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Server activo');
      expect(result.data).toEqual({ message: 'pong' });
    });
  });
});
