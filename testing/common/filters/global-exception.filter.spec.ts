import { GlobalExceptionFilter } from '../../../src/common/filters/global-exception.filter';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

function createMockHost(mockResponse: any, mockRequest?: any) {
  return {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () =>
        mockRequest ?? { method: 'GET', url: '/v1/posts', headers: {} },
    }),
  } as unknown as ArgumentsHost;
}

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch() - HttpException', () => {
    it('should handle NotFoundException (404)', () => {
      const exception = new NotFoundException('Resource not found');
      const host = createMockHost(mockResponse);

      filter.catch(exception, host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ statusCode: HttpStatus.NOT_FOUND }),
        }),
      );
    });

    it('should handle BadRequestException (400)', () => {
      const exception = new BadRequestException('Validation failed');
      const host = createMockHost(mockResponse);

      filter.catch(exception, host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it('should handle UnauthorizedException (401)', () => {
      const exception = new UnauthorizedException('Not authorized');
      const host = createMockHost(mockResponse);

      filter.catch(exception, host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('should use string response as message when getResponse returns string', () => {
      const exception = new HttpException('Direct string error', HttpStatus.CONFLICT);
      const host = createMockHost(mockResponse);

      filter.catch(exception, host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Direct string error' }),
      );
    });

    it('should extract message from object response', () => {
      const exception = new BadRequestException({ message: ['field is required'], error: 'Bad Request' });
      const host = createMockHost(mockResponse);

      filter.catch(exception, host);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });
  });

  describe('catch() - unknown errors', () => {
    it('should return 500 for non-HttpException errors', () => {
      const exception = new Error('Something went wrong');
      const host = createMockHost(mockResponse);

      filter.catch(exception, host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Error interno del servidor',
          error: expect.objectContaining({ statusCode: HttpStatus.INTERNAL_SERVER_ERROR }),
        }),
      );
    });

    it('should return 500 for thrown strings', () => {
      const host = createMockHost(mockResponse);

      filter.catch('Unexpected string error', host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should return 500 for null exceptions', () => {
      const host = createMockHost(mockResponse);

      filter.catch(null, host);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  describe('response format', () => {
    it('should return ApiResponse.error shape with timestamp', () => {
      const exception = new NotFoundException('Not found');
      const host = createMockHost(mockResponse);

      filter.catch(exception, host);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('success', false);
      expect(jsonCall).toHaveProperty('message');
      expect(jsonCall).toHaveProperty('timestamp');
      expect(jsonCall).toHaveProperty('error.statusCode');
    });
  });
});
