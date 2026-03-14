import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '../../../src/common/services/logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);

    logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
    warnSpy = jest.spyOn((service as any).logger, 'warn').mockImplementation(() => {});
    debugSpy = jest.spyOn((service as any).logger, 'debug').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log()', () => {
    it('should call logger.log with message and context', () => {
      service.log('Test message', 'TestContext');
      expect(logSpy).toHaveBeenCalledWith('Test message', 'TestContext');
    });

    it('should call logger.log without context', () => {
      service.log('Test message');
      expect(logSpy).toHaveBeenCalledWith('Test message', undefined);
    });
  });

  describe('error()', () => {
    it('should call logger.error with message, trace and context', () => {
      service.error('Error occurred', 'stack trace', 'ErrorContext');
      expect(errorSpy).toHaveBeenCalledWith('Error occurred', 'stack trace', 'ErrorContext');
    });
  });

  describe('warn()', () => {
    it('should call logger.warn with message and context', () => {
      service.warn('Warning message', 'WarnContext');
      expect(warnSpy).toHaveBeenCalledWith('Warning message', 'WarnContext');
    });
  });

  describe('debug()', () => {
    it('should call logger.debug with message and context', () => {
      service.debug('Debug message', 'DebugContext');
      expect(debugSpy).toHaveBeenCalledWith('Debug message', 'DebugContext');
    });
  });

  describe('logRequest()', () => {
    it('should call log() for 2xx responses', () => {
      const mockReq = { method: 'GET', url: '/v1/posts', ip: '127.0.0.1' } as any;
      const mockRes = { statusCode: 200 } as any;

      service.logRequest(mockReq, mockRes, 45);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /v1/posts - 200 - 45ms'),
        'HTTP',
      );
    });

    it('should call error() for 4xx responses', () => {
      const mockReq = { method: 'GET', url: '/v1/posts/notfound', ip: '127.0.0.1' } as any;
      const mockRes = { statusCode: 404 } as any;

      service.logRequest(mockReq, mockRes, 10);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /v1/posts/notfound - 404'),
        '',
        'HTTP',
      );
    });

    it('should call error() for 5xx responses', () => {
      const mockReq = { method: 'POST', url: '/v1/posts', ip: '127.0.0.1' } as any;
      const mockRes = { statusCode: 500 } as any;

      service.logRequest(mockReq, mockRes, 100);

      expect(errorSpy).toHaveBeenCalled();
    });

    it('should include responseTime in log message', () => {
      const mockReq = { method: 'GET', url: '/v1/health/ping', ip: '10.0.0.1' } as any;
      const mockRes = { statusCode: 200 } as any;

      service.logRequest(mockReq, mockRes, 123);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('123ms'),
        'HTTP',
      );
    });
  });

  describe('logPerformance()', () => {
    it('should call debug() for operations under 1000ms', () => {
      service.logPerformance('FindAll posts', 150);

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('FindAll posts completed in 150ms'),
        undefined,
      );
    });

    it('should call warn() for operations over 1000ms', () => {
      service.logPerformance('FindAll posts', 1500, 'PostsService');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SLOW:'),
        'PostsService',
      );
    });

    it('should call warn() for operations exactly at 1001ms', () => {
      service.logPerformance('Operation', 1001);

      expect(warnSpy).toHaveBeenCalled();
    });

    it('should call debug() for operations exactly at 1000ms', () => {
      service.logPerformance('Operation', 1000);

      expect(debugSpy).toHaveBeenCalled();
    });
  });
});
