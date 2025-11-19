import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('User-Agent') || '';
    
    if (!req['requestId']) {
      req['requestId'] = `req-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    }
    // Generate request ID for tracking
    const requestId = req['requestId'];

    // Log incoming request
    this.logger.log(
      `🚀 [${requestId}] ${method} ${originalUrl} - ${ip} - ${userAgent}`
    );

    // Hook into response finish to log completion
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const user = req['user'];
      const userInfo = user ? `User: ${user.username}(${user.accessLevel})` : 'Anonymous';
      
      // Choose log level based on status code
      const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'log';
      
      this.logger[logLevel](
        `✅ [${requestId}] ${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${userInfo}`
      );

      // Log slow requests
      if (duration > 1000) {
        this.logger.warn(`🐌 [${requestId}] Slow request detected: ${duration}ms`);
      }
    });

    next();
  }
}