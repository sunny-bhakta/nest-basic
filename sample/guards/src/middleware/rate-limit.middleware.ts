import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly store: RateLimitStore = {};
  private readonly windowMs: number = 15 * 60 * 1000; // 15 minutes
  private readonly maxRequests: number = 100; // Max requests per window

  use(req: Request, res: Response, next: NextFunction): void {
    const clientId = this.getClientIdentifier(req);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanupExpiredEntries(now);
    
    // Get or create rate limit data for client
    if (!this.store[clientId]) {
      this.store[clientId] = {
        count: 0,
        resetTime: now + this.windowMs
      };
    }

    const clientData = this.store[clientId];

    // Reset if window has expired
    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + this.windowMs;
    }

    // Increment request count
    clientData.count++;

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': this.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, this.maxRequests - clientData.count).toString(),
      'X-RateLimit-Reset': new Date(clientData.resetTime).toISOString(),
    });

    // Check if limit exceeded
    if (clientData.count > this.maxRequests) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests',
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    next();
  }

  private getClientIdentifier(req: Request): string {
    // Use user ID if authenticated, otherwise use IP
    const user = req['user'];
    if (user) {
      return `user:${user.id}`;
    }
    
    // Get client IP (considering proxies)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
      : req.connection.remoteAddress;
    
    return `ip:${ip}`;
  }

  private cleanupExpiredEntries(now: number): void {
    // Clean up expired entries every 100 requests to prevent memory leaks
    if (Math.random() < 0.01) {
      Object.keys(this.store).forEach(key => {
        if (now > this.store[key].resetTime) {
          delete this.store[key];
        }
      });
    }
  }
}