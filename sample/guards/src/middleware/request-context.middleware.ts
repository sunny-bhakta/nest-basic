import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Add request ID if not already set by logging middleware
    if (!req['requestId']) {
      req['requestId'] = `req-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    }

    // Add timestamp
    req['startTime'] = Date.now();

    // Add request context object
    req['context'] = {
      requestId: req['requestId'],
      startTime: req['startTime'],
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('User-Agent'),
      ip: this.getClientIp(req),
      user: null, // Will be populated by authentication guards
    };

    // Set request ID in response header for client tracking
    res.setHeader('X-Request-ID', req['requestId']);

    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    }
    return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  }
}