import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Response transformation interceptor that standardizes API response format
 * Ensures consistent response structure across all endpoints
 */
@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseTransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = request['requestId'] || 'unknown';
    const userId = request['user']?.id || null;

    return next.handle().pipe(
      map((data) => {
        // Skip transformation for certain content types
        if (this.shouldSkipTransformation(response, data)) {
          return data;
        }

        // Create standardized response format
        const transformedResponse = {
          success: true,
          statusCode: response.statusCode,
          message: this.generateSuccessMessage(request.method, response.statusCode),
          data: data,
          meta: {
            timestamp: new Date().toISOString(),
            requestId: requestId,
            path: request.url,
            method: request.method,
            version: '1.0',
            ...(userId && { userId }),
          }
        };

        // Add pagination info if present
        if (this.isPaginatedResponse(data)) {
          transformedResponse.meta = {
            ...transformedResponse.meta,
            pagination: {
              page: data.page,
              limit: data.limit,
              total: data.total,
              totalPages: data.totalPages,
              hasNextPage: data.hasNextPage,
              hasPrevPage: data.hasPrevPage,
            }
          };
        }

        // Add response size info
        const responseSize = JSON.stringify(transformedResponse).length;
        transformedResponse.meta.responseSize = `${Math.round(responseSize / 1024)}KB`;

        this.logger.debug(
          `RESPONSE TRANSFORMED [${requestId}] ${request.method} ${request.url} - ` +
          `Size: ${Math.round(responseSize / 1024)}KB`
        );

        return transformedResponse;
      })
    );
  }

  private shouldSkipTransformation(response: Response, data: any): boolean {
    // Skip for file downloads, streams, or already transformed responses
    const contentType = response.getHeader('Content-Type') as string;
    
    return (
      contentType?.includes('application/octet-stream') ||
      contentType?.includes('text/html') ||
      contentType?.includes('image/') ||
      data?.success !== undefined || // Already transformed
      data instanceof Buffer ||
      typeof data === 'string' && data.startsWith('<!DOCTYPE') // HTML response
    );
  }

  private generateSuccessMessage(method: string, statusCode: number): string {
    const messages = {
      GET: {
        200: 'Data retrieved successfully',
        201: 'Resource created successfully',
        204: 'Operation completed successfully',
      },
      POST: {
        200: 'Request processed successfully',
        201: 'Resource created successfully',
      },
      PUT: {
        200: 'Resource updated successfully',
        201: 'Resource created successfully',
      },
      PATCH: {
        200: 'Resource updated successfully',
      },
      DELETE: {
        200: 'Resource deleted successfully',
        204: 'Resource deleted successfully',
      }
    };

    return messages[method]?.[statusCode] || 'Operation completed successfully';
  }

  private isPaginatedResponse(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'page' in data &&
      'limit' in data &&
      'total' in data
    );
  }
}

/**
 * Data serialization interceptor that handles data transformation and formatting
 */
@Injectable()
export class SerializationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SerializationInterceptor.name);

  constructor(private readonly options: {
    excludeFields?: string[];
    includeTimestamps?: boolean;
    formatDates?: boolean;
    removeNulls?: boolean;
  } = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    
    const requestId = request['requestId'] || 'unknown';

    return next.handle().pipe(
      map((data) => {
        const serializedData = this.serializeData(data);
        
        this.logger.debug(
          `DATA SERIALIZED [${requestId}] ${request.method} ${request.url}`
        );

        return serializedData;
      })
    );
  }

  private serializeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.serializeData(item));
    }

    if (typeof data === 'object' && data.constructor === Object) {
      const serialized: any = {};

      for (const [key, value] of Object.entries(data)) {
        // Skip excluded fields
        if (this.options.excludeFields?.includes(key)) {
          continue;
        }

        // Remove null values if configured
        if (this.options.removeNulls && value === null) {
          continue;
        }

        // Format dates if configured
        if (this.options.formatDates && this.isDate(value)) {
          serialized[key] = this.formatDate(value);
        } else {
          serialized[key] = this.serializeData(value);
        }
      }

      // Add timestamps if configured
      if (this.options.includeTimestamps) {
        serialized.serializedAt = new Date().toISOString();
      }

      return serialized;
    }

    // Handle Date objects
    if (this.options.formatDates && this.isDate(data)) {
      return this.formatDate(data);
    }

    return data;
  }

  private isDate(value: any): boolean {
    return (
      value instanceof Date ||
      (typeof value === 'string' && !isNaN(Date.parse(value)))
    );
  }

  private formatDate(date: any): string {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString();
  }
}

/**
 * Cache control interceptor that adds appropriate caching headers
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheControlInterceptor.name);

  constructor(private readonly options: {
    defaultTTL?: number; // seconds
    publicCache?: boolean;
    varyHeaders?: string[];
  } = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = request['requestId'] || 'unknown';

    return next.handle().pipe(
      map((data) => {
        // Only add cache headers for GET requests
        if (request.method === 'GET') {
          this.setCacheHeaders(request, response, data);
          
          this.logger.debug(
            `CACHE HEADERS SET [${requestId}] ${request.method} ${request.url}`
          );
        }

        return data;
      })
    );
  }

  private setCacheHeaders(request: Request, response: Response, data: any): void {
    const ttl = this.determineTTL(request, data);
    const isPublic = this.options.publicCache ?? this.shouldBePublic(request);

    if (ttl > 0) {
      const cacheControl = isPublic ? 'public' : 'private';
      response.setHeader('Cache-Control', `${cacheControl}, max-age=${ttl}`);
      
      // Add ETag for better cache validation
      const etag = this.generateETag(data);
      response.setHeader('ETag', etag);

      // Add Vary headers if configured
      if (this.options.varyHeaders?.length) {
        response.setHeader('Vary', this.options.varyHeaders.join(', '));
      }

      // Add Last-Modified if data has timestamp
      if (data?.updatedAt || data?.createdAt) {
        const lastModified = new Date(data.updatedAt || data.createdAt);
        response.setHeader('Last-Modified', lastModified.toUTCString());
      }
    } else {
      // No caching for dynamic content
      response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
    }
  }

  private determineTTL(request: Request, data: any): number {
    // Custom TTL based on endpoint or data type
    if (request.url.includes('/public/')) {
      return 3600; // 1 hour for public content
    }

    if (request.url.includes('/catalog/')) {
      return 300; // 5 minutes for catalog items
    }

    if (request.url.includes('/user/') || request.url.includes('/admin/')) {
      return 0; // No caching for user-specific content
    }

    return this.options.defaultTTL || 60; // Default 1 minute
  }

  private shouldBePublic(request: Request): boolean {
    // Public if no authentication required
    return !request.headers.authorization && request.url.includes('/public/');
  }

  private generateETag(data: any): string {
    // Simple ETag generation based on data hash
    const dataString = JSON.stringify(data);
    const hash = this.simpleHash(dataString);
    return `"${hash}"`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}