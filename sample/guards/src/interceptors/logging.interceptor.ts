import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Logging interceptor that tracks request/response timing and provides detailed logs
 * Integrates with the existing RequestContextMiddleware for consistent request tracking
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    // Extract request context (set by RequestContextMiddleware)
    const requestId = request['requestId'] || 'unknown';
    const userId = request['user']?.id || 'anonymous';
    const userRole = request['user']?.accessLevel || 'none';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';
    
    const { method, url } = request;
    const startTime = Date.now();
    
    // Log incoming request
    this.logger.log(
      `INCOMING [${requestId}] ${method} ${url} - User: ${userId}(${userRole}) - IP: ${ip}`
    );

    // Log request body for POST/PUT/PATCH (excluding sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(method) && request.body) {
      const sanitizedBody = this.sanitizeRequestBody(request.body);
      this.logger.debug(
        `REQUEST BODY [${requestId}] ${JSON.stringify(sanitizedBody)}`
      );
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;
        
        // Log successful response
        this.logger.log(
          `OUTGOING [${requestId}] ${method} ${url} ${statusCode} - ${duration}ms - User: ${userId}`
        );

        // Log response size and type
        const responseSize = JSON.stringify(data).length;
        this.logger.debug(
          `RESPONSE [${requestId}] Size: ${responseSize} bytes - Type: ${typeof data}`
        );

        // Performance warning for slow requests
        if (duration > 1000) {
          this.logger.warn(
            `SLOW REQUEST [${requestId}] ${method} ${url} took ${duration}ms - Consider optimization`
          );
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        
        // Log error response
        this.logger.error(
          `ERROR [${requestId}] ${method} ${url} - ${duration}ms - User: ${userId} - Error: ${error.message}`,
          error.stack
        );

        // Security alert for potential attacks
        if (this.isPotentialSecurityThreat(error, request)) {
          this.logger.error(
            `SECURITY ALERT [${requestId}] Potential attack detected - IP: ${ip} - UserAgent: ${userAgent} - Error: ${error.message}`
          );
        }

        throw error;
      })
    );
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Recursively sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestBody(value);
      }
    }

    return sanitized;
  }

  private isPotentialSecurityThreat(error: any, request: Request): boolean {
    const securityIndicators = [
      'SQL injection',
      'XSS',
      'script injection',
      'path traversal',
      'command injection',
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const url = request.url?.toLowerCase() || '';
    const userAgent = request.get('User-Agent')?.toLowerCase() || '';

    return securityIndicators.some(indicator => 
      errorMessage.includes(indicator) || 
      url.includes(indicator) || 
      userAgent.includes(indicator)
    );
  }
}

/**
 * Performance interceptor that tracks execution time and adds timing headers
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = request['requestId'] || 'unknown';
    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        // Add performance headers
        response.setHeader('X-Response-Time', `${duration}ms`);
        response.setHeader('X-Memory-Usage', `${Math.round(memoryDelta / 1024)}KB`);
        response.setHeader('X-Request-ID', requestId);

        // Log performance metrics
        this.logger.debug(
          `PERFORMANCE [${requestId}] ${request.method} ${request.url} - ` +
          `Time: ${duration}ms, Memory: ${Math.round(memoryDelta / 1024)}KB`
        );

        // Alert on high memory usage
        if (memoryDelta > 10 * 1024 * 1024) { // 10MB
          this.logger.warn(
            `HIGH MEMORY USAGE [${requestId}] ${Math.round(memoryDelta / 1024 / 1024)}MB - ` +
            `Route: ${request.method} ${request.url}`
          );
        }

        // Alert on slow requests
        if (duration > 2000) {
          this.logger.warn(
            `SLOW REQUEST ALERT [${requestId}] ${request.method} ${request.url} - ${duration}ms`
          );
        }
      })
    );
  }
}