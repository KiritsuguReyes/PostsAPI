import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { JwtClaimsUtil } from '../utils/jwt-claims.util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const { method, url, ip } = request;
    const userAgent = request.get('User-Agent') || '';
    const startTime = Date.now();

    // Extraer información del usuario autenticado (si existe) - Simplificado como C#
    const userId = JwtClaimsUtil.getUserId(request) || 'anonymous';
    const userEmail = JwtClaimsUtil.getUserEmail(request) || 'no-auth';

    // Log de la request entrante
    this.logger.log(
      `📥 ${method} ${url} - IP: ${ip} - User: ${userEmail} (${userId}) - UA: ${userAgent.substring(0, 50)}...`
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const endTime = Date.now();
          const duration = endTime - startTime;
          const { statusCode } = response;

          // Log de la response exitosa
          const message = `✅ ${method} ${url} - ${statusCode} - ${duration}ms - User: ${userEmail}`;

          // Log adicional para requests críticas
          if (method === 'POST' && url.includes('/auth/login')) {
            this.logger.log(`🔐 Login attempt: ${userEmail || request.body?.email} - ${statusCode === 200 ? 'SUCCESS' : 'FAILED'}`);
          }

        },
        error: (error) => {
          const endTime = Date.now();
          const duration = endTime - startTime;

          // Log de errores
          this.logger.error(
            `❌ ${method} ${url} - ERROR - ${duration}ms - User: ${userEmail} - Error: ${error.message}`,
            error.stack,
            'Request Error'
          );
        }
      })
    );
  }
}
