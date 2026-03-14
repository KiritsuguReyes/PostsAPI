import { LoggingInterceptor } from '../../../src/common/interceptors/logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

function createMockContext(requestOverrides: any = {}) {
  const mockRequest = {
    method: 'GET',
    url: '/v1/posts',
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('TestAgent/1.0'),
    user: null,
    ...requestOverrides,
  };
  const mockResponse = {
    statusCode: 200,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
  } as unknown as ExecutionContext;
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    jest.spyOn((interceptor as any).logger, 'log').mockImplementation(() => {});
    jest.spyOn((interceptor as any).logger, 'error').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept()', () => {
    it('should call next.handle() and pass through the response', (done) => {
      const context = createMockContext();
      const responseData = { id: 1, title: 'Post' };
      const next: CallHandler = { handle: () => of(responseData) };

      interceptor.intercept(context, next).subscribe((data) => {
        expect(data).toEqual(responseData);
        done();
      });
    });

    it('should log the incoming request', (done) => {
      const context = createMockContext();
      const next: CallHandler = { handle: () => of({}) };
      const logSpy = jest.spyOn((interceptor as any).logger, 'log');

      interceptor.intercept(context, next).subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('📥 GET /v1/posts'),
        );
        done();
      });
    });

    it('should log IP address in the request log', (done) => {
      const context = createMockContext({ ip: '192.168.1.1' });
      const next: CallHandler = { handle: () => of({}) };
      const logSpy = jest.spyOn((interceptor as any).logger, 'log');

      interceptor.intercept(context, next).subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('IP: 192.168.1.1'),
        );
        done();
      });
    });

    it('should show authenticated user email when user is in request', (done) => {
      const context = createMockContext({
        user: { email: 'user@example.com', sub: 'uid123' },
      });
      const next: CallHandler = { handle: () => of({}) };
      const logSpy = jest.spyOn((interceptor as any).logger, 'log');

      interceptor.intercept(context, next).subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('user@example.com'),
        );
        done();
      });
    });

    it('should show "no-auth" when no user in request', (done) => {
      const context = createMockContext({ user: undefined });
      const next: CallHandler = { handle: () => of({}) };
      const logSpy = jest.spyOn((interceptor as any).logger, 'log');

      interceptor.intercept(context, next).subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('no-auth'),
        );
        done();
      });
    });

    it('should log error with ❌ prefix on error', (done) => {
      const context = createMockContext();
      const error = new Error('Something went wrong');
      const next: CallHandler = { handle: () => throwError(() => error) };
      const errorSpy = jest.spyOn((interceptor as any).logger, 'error');

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('❌'),
            expect.anything(),
            'Request Error',
          );
          done();
        },
      });
    });

    it('should log a special message for login requests (POST /auth/login)', (done) => {
      const context = createMockContext({
        method: 'POST',
        url: '/v1/auth/login',
        body: { email: 'user@example.com' },
      });
      const next: CallHandler = { handle: () => of({ access_token: 'token' }) };
      const logSpy = jest.spyOn((interceptor as any).logger, 'log');

      interceptor.intercept(context, next).subscribe(() => {
        // Debería haberse logeado el intento de login
        const calls = logSpy.mock.calls.map((c) => c[0] as string);
        const loginLog = calls.find((c) => c.includes('Login attempt') || c.includes('🔐'));
        expect(loginLog).toBeDefined();
        done();
      });
    });
  });
});
