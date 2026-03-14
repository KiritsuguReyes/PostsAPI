import { Injectable, Logger, LogLevel } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger(LoggerService.name);

  log(message: string, context?: string) {
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, context);
  }

  logRequest(req: Request, res: Response, responseTime: number) {
    const { method, url, ip } = req;
    const { statusCode } = res;
    const message = `${method} ${url} - ${statusCode} - ${responseTime}ms - IP: ${ip}`;
    
    if (statusCode >= 400) {
      this.error(message, '', 'HTTP');
    } else {
      this.log(message, 'HTTP');
    }
  }

  logPerformance(operation: string, duration: number, context?: string) {
    const message = `${operation} completed in ${duration}ms`;
    if (duration > 1000) {
      this.warn(`SLOW: ${message}`, context);
    } else {
      this.debug(message, context);
    }
  }
}
