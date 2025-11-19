import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LifecycleEventEmitter } from '../lifecycle-event-emitter.service';

// Extend Request interface to include optional user and session properties
interface ExtendedRequest extends Request {
  user?: any;
  sessionID?: string;
}

/**
 * Enhanced request context middleware that integrates with lifecycle events
 * Emits request start events and enriches request context
 */
@Injectable()
export class LifecycleRequestMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LifecycleRequestMiddleware.name);

  constructor(private readonly eventEmitter: LifecycleEventEmitter) {}

  use(req: ExtendedRequest, res: Response, next: NextFunction): void {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Enrich request with context
    req['requestId'] = requestId;
    req['startTime'] = startTime;
    req['correlationId'] = req.headers['x-correlation-id'] as string || this.generateCorrelationId();
    
    // Extract route information if available
    const route = req.route?.path;
    const controller = this.extractControllerFromRoute(req);
    const handler = this.extractHandlerFromRoute(req);

    // Emit request start event
    this.eventEmitter.emitRequestStart({
      requestId,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      userId: this.extractUserId(req),
      correlationId: req['correlationId'],
      sessionId: this.extractSessionId(req),
      method: req.method,
      url: req.url,
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      route,
      controller,
      handler,
    });

    // Add response finished listener to emit response event
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      this.eventEmitter.emitResponseEvent({
        requestId,
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        userId: this.extractUserId(req),
        correlationId: req['correlationId'],
        sessionId: this.extractSessionId(req),
        statusCode: res.statusCode,
        contentType: res.get('Content-Type'),
        contentLength: this.getContentLength(res),
        duration,
        cacheStatus: this.getCacheStatus(res),
        compressionRatio: this.getCompressionRatio(res),
        headers: this.sanitizeHeaders(res.getHeaders()),
      });
    });

    // Add error listener to emit error events
    res.on('error', (error: Error) => {
      this.eventEmitter.emitErrorEvent({
        requestId,
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        userId: this.extractUserId(req),
        correlationId: req['correlationId'],
        sessionId: this.extractSessionId(req),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        phase: 'middleware',
        recovery: 'unhandled',
        context: {
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
        },
      });
    });

    next();
  }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(req: ExtendedRequest): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  private extractUserId(req: ExtendedRequest): string | undefined {
    // Extract user ID from various possible locations
    return (
      req.user?.['id'] ||
      req.user?.['userId'] ||
      req.user?.['sub'] ||
      req.headers['x-user-id'] as string ||
      undefined
    );
  }

  private extractSessionId(req: ExtendedRequest): string | undefined {
    return (
      req.sessionID ||
      req.headers['x-session-id'] as string ||
      req.cookies?.['sessionId'] ||
      undefined
    );
  }

  private extractControllerFromRoute(req: ExtendedRequest): string | undefined {
    // This is a simplified extraction - in a real app you'd have more sophisticated logic
    const pathParts = req.path.split('/').filter(Boolean);
    return pathParts[0] ? `${pathParts[0]}Controller` : undefined;
  }

  private extractHandlerFromRoute(req: ExtendedRequest): string | undefined {
    // This is a simplified extraction - in a real app you'd have more sophisticated logic
    const pathParts = req.path.split('/').filter(Boolean);
    const method = req.method.toLowerCase();
    
    if (pathParts.length > 1) {
      return `${method}${pathParts[1]}`;
    } else if (pathParts.length === 1) {
      return `${method}All`;
    }
    
    return undefined;
  }

  private sanitizeHeaders(headers: any): Record<string, string | string[]> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private getContentLength(res: Response): number | undefined {
    const contentLength = res.get('Content-Length');
    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  private getCacheStatus(res: Response): 'hit' | 'miss' | 'skip' | undefined {
    const cacheStatus = res.get('X-Cache-Status') || res.get('Cache-Status');
    if (cacheStatus) {
      const status = cacheStatus.toLowerCase();
      if (status.includes('hit')) return 'hit';
      if (status.includes('miss')) return 'miss';
      return 'skip';
    }
    return undefined;
  }

  private getCompressionRatio(res: Response): number | undefined {
    const encoding = res.get('Content-Encoding');
    const originalLength = res.get('X-Original-Content-Length');
    const compressedLength = res.get('Content-Length');
    
    if (encoding && originalLength && compressedLength) {
      const original = parseInt(originalLength, 10);
      const compressed = parseInt(compressedLength, 10);
      return original > 0 ? compressed / original : undefined;
    }
    
    return undefined;
  }
}