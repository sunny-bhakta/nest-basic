import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Simple in-memory cache implementation for demonstration
 * In production, use Redis or another distributed cache
 */
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly logger = new Logger(MemoryCache.name);

  set(key: string, data: any, ttl: number): void {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { data, expiry });
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      this.cleanup();
    }
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Cache cleanup: removed ${deletedCount} expired entries`);
    }
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need hit/miss tracking for real hit rate
    };
  }
}

/**
 * Caching interceptor that caches GET request responses
 * Integrates with cache control headers and supports cache invalidation
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly cache = new MemoryCache();

  constructor(private readonly options: {
    ttl?: number; // seconds
    keyGenerator?: (request: Request) => string;
    shouldCache?: (request: Request, response: Response) => boolean;
    excludeRoutes?: string[];
  } = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = request['requestId'] || 'unknown';

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Check if route should be excluded from caching
    if (this.shouldExcludeRoute(request)) {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request);
    const cachedData = this.cache.get(cacheKey);

    if (cachedData) {
      // Cache hit
      response.setHeader('X-Cache', 'HIT');
      response.setHeader('X-Cache-Key', cacheKey);
      
      this.logger.debug(
        `CACHE HIT [${requestId}] ${request.method} ${request.url} - Key: ${cacheKey}`
      );

      return of(cachedData);
    }

    // Cache miss - execute handler and cache result
    response.setHeader('X-Cache', 'MISS');
    response.setHeader('X-Cache-Key', cacheKey);

    return next.handle().pipe(
      tap((data) => {
        if (this.shouldCacheResponse(request, response, data)) {
          const ttl = this.determineTTL(request, data);
          this.cache.set(cacheKey, data, ttl);
          
          response.setHeader('X-Cache-TTL', `${ttl}s`);
          
          this.logger.debug(
            `CACHE STORED [${requestId}] ${request.method} ${request.url} - ` +
            `Key: ${cacheKey}, TTL: ${ttl}s`
          );
        }
      }),
      catchError((error) => {
        this.logger.warn(
          `CACHE ERROR [${requestId}] ${request.method} ${request.url} - ${error.message}`
        );
        return throwError(() => error);
      })
    );
  }

  private generateCacheKey(request: Request): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(request);
    }

    // Default key generation
    const userId = request['user']?.id || 'anonymous';
    const url = request.url;
    const query = JSON.stringify(request.query);
    
    return `cache:${request.method}:${url}:${query}:${userId}`;
  }

  private shouldExcludeRoute(request: Request): boolean {
    if (!this.options.excludeRoutes) {
      return false;
    }

    return this.options.excludeRoutes.some(route => 
      request.url.includes(route)
    );
  }

  private shouldCacheResponse(request: Request, response: Response, data: any): boolean {
    // Custom logic override
    if (this.options.shouldCache) {
      return this.options.shouldCache(request, response);
    }

    // Default caching rules
    return (
      response.statusCode === 200 &&
      data !== null &&
      data !== undefined &&
      !request.url.includes('/admin/') && // Don't cache admin routes
      !request.url.includes('/user/profile') && // Don't cache user-specific data
      !response.getHeader('Set-Cookie') // Don't cache responses that set cookies
    );
  }

  private determineTTL(request: Request, data: any): number {
    // Route-specific TTL
    if (request.url.includes('/catalog/')) {
      return 300; // 5 minutes for catalog
    }

    if (request.url.includes('/public/')) {
      return 3600; // 1 hour for public content
    }

    if (request.url.includes('/search/')) {
      return 60; // 1 minute for search results
    }

    return this.options.ttl || 120; // Default 2 minutes
  }

  // Cache management methods
  invalidateCache(pattern?: string): void {
    if (pattern) {
      // In a real implementation, you'd have pattern-based invalidation
      this.logger.log(`Cache invalidation requested for pattern: ${pattern}`);
    } else {
      this.cache.clear();
      this.logger.log('Cache cleared completely');
    }
  }

  getCacheStats(): any {
    return this.cache.getStats();
  }
}

/**
 * Timeout interceptor that prevents long-running requests
 */
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TimeoutInterceptor.name);

  constructor(private readonly options: {
    timeout?: number; // milliseconds
    routeTimeouts?: Record<string, number>; // route-specific timeouts
  } = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    
    const requestId = request['requestId'] || 'unknown';
    const timeout = this.getTimeoutForRoute(request);

    this.logger.debug(
      `TIMEOUT SET [${requestId}] ${request.method} ${request.url} - ${timeout}ms`
    );

    return new Observable(subscriber => {
      const timeoutId = setTimeout(() => {
        this.logger.error(
          `REQUEST TIMEOUT [${requestId}] ${request.method} ${request.url} - ` +
          `Exceeded ${timeout}ms timeout`
        );
        
        subscriber.error(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);

      const subscription = next.handle().subscribe({
        next: (value) => {
          clearTimeout(timeoutId);
          subscriber.next(value);
        },
        error: (error) => {
          clearTimeout(timeoutId);
          subscriber.error(error);
        },
        complete: () => {
          clearTimeout(timeoutId);
          subscriber.complete();
        }
      });

      return () => {
        clearTimeout(timeoutId);
        subscription.unsubscribe();
      };
    });
  }

  private getTimeoutForRoute(request: Request): number {
    // Check for route-specific timeout
    if (this.options.routeTimeouts) {
      for (const [route, timeout] of Object.entries(this.options.routeTimeouts)) {
        if (request.url.includes(route)) {
          return timeout;
        }
      }
    }

    // Default timeout based on method
    if (request.method === 'GET') {
      return this.options.timeout || 5000; // 5 seconds for GET
    }

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      return this.options.timeout || 10000; // 10 seconds for mutations
    }

    return this.options.timeout || 30000; // 30 seconds default
  }
}

/**
 * Rate limiting interceptor that tracks request frequency per user
 */
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private readonly options: {
    maxRequests?: number;
    windowMs?: number; // time window in milliseconds
    keyGenerator?: (request: Request) => string;
    skipSuccessfulRequests?: boolean;
  } = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = request['requestId'] || 'unknown';
    const key = this.generateKey(request);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = this.requestCounts.get(key);
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + (this.options.windowMs || 60000) // Default 1 minute window
      };
      this.requestCounts.set(key, entry);
    }

    // Check rate limit
    const maxRequests = this.options.maxRequests || 100;
    if (entry.count >= maxRequests) {
      const resetIn = Math.ceil((entry.resetTime - now) / 1000);
      
      response.setHeader('X-RateLimit-Limit', maxRequests.toString());
      response.setHeader('X-RateLimit-Remaining', '0');
      response.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
      
      this.logger.warn(
        `RATE LIMIT EXCEEDED [${requestId}] Key: ${key} - Reset in ${resetIn}s`
      );

      return throwError(() => new Error(`Rate limit exceeded. Try again in ${resetIn} seconds.`));
    }

    // Increment counter
    entry.count++;

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', maxRequests.toString());
    response.setHeader('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
    response.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

    return next.handle().pipe(
      tap(() => {
        // Optionally decrement on successful requests
        if (this.options.skipSuccessfulRequests) {
          entry!.count = Math.max(0, entry!.count - 1);
        }
      }),
      catchError((error) => {
        // Count failed requests towards rate limit
        this.logger.debug(
          `RATE LIMIT [${requestId}] Failed request counted - Key: ${key}, Count: ${entry!.count}`
        );
        return throwError(() => error);
      })
    );
  }

  private generateKey(request: Request): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(request);
    }

    // Default key generation: IP + User ID (if available)
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userId = request['user']?.id || 'anonymous';
    
    return `ratelimit:${ip}:${userId}`;
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.requestCounts.entries()) {
      if (now > entry.resetTime) {
        this.requestCounts.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.logger.debug(`Rate limit cleanup: removed ${deletedCount} expired entries`);
    }
  }
}