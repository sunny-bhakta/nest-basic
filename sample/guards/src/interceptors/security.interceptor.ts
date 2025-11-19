import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Security interceptor that adds security headers and monitors for threats
 * Integrates with existing security middleware and exception filters
 */
@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityInterceptor.name);
  private readonly suspiciousAttempts = new Map<string, { count: number; lastAttempt: number }>();

  constructor(private readonly options: {
    enableSecurityHeaders?: boolean;
    detectSuspiciousActivity?: boolean;
    maxFailedAttempts?: number;
    blockDuration?: number; // minutes
    sensitiveRoutes?: string[];
  } = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = request['requestId'] || 'unknown';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';

    // Check if IP is currently blocked
    if (this.isBlocked(ip)) {
      this.logger.error(
        `BLOCKED REQUEST [${requestId}] IP: ${ip} - Currently blocked due to suspicious activity`
      );
      return throwError(() => new BadRequestException('Access temporarily restricted'));
    }

    // Add security headers
    if (this.options.enableSecurityHeaders !== false) {
      this.addSecurityHeaders(response);
    }

    // Monitor sensitive routes
    if (this.isSensitiveRoute(request)) {
      this.logger.warn(
        `SENSITIVE ROUTE ACCESS [${requestId}] ${request.method} ${request.url} - ` +
        `IP: ${ip} - UserAgent: ${userAgent}`
      );
    }

    // Detect potential attacks in request
    this.detectPotentialAttacks(request, requestId);

    return next.handle().pipe(
      tap(() => {
        // Reset suspicious activity counter on successful request
        if (this.suspiciousAttempts.has(ip)) {
          this.suspiciousAttempts.delete(ip);
        }
      }),
      catchError((error) => {
        // Track failed requests for suspicious activity detection
        if (this.options.detectSuspiciousActivity !== false) {
          this.trackFailedAttempt(ip, request, error);
        }

        return throwError(() => error);
      })
    );
  }

  private addSecurityHeaders(response: Response): void {
    // Content Security Policy
    response.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
    );

    // XSS Protection
    response.setHeader('X-XSS-Protection', '1; mode=block');

    // Content Type Options
    response.setHeader('X-Content-Type-Options', 'nosniff');

    // Frame Options
    response.setHeader('X-Frame-Options', 'DENY');

    // Referrer Policy
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    response.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), payment=()'
    );

    // HSTS (HTTP Strict Transport Security)
    response.setHeader('Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  private isSensitiveRoute(request: Request): boolean {
    const defaultSensitiveRoutes = [
      '/admin/',
      '/auth/',
      '/login',
      '/password',
      '/reset',
      '/api/admin/',
      '/api/auth/',
    ];

    const sensitiveRoutes = this.options.sensitiveRoutes || defaultSensitiveRoutes;
    
    return sensitiveRoutes.some(route => 
      request.url.toLowerCase().includes(route.toLowerCase())
    );
  }

  private detectPotentialAttacks(request: Request, requestId: string): void {
    const attackPatterns = {
      sqlInjection: [
        /(\'|(\\\')|(;)|(--)|(\/\*)|(\\*\/))/i,
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b)/i,
      ],
      xss: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
      ],
      pathTraversal: [
        /\.\.\//g,
        /\.\.\\/g,
        /%2e%2e%2f/gi,
        /%2e%2e%5c/gi,
      ],
      commandInjection: [
        /[;&|`$()]/g,
        /\b(cat|ls|pwd|whoami|id|uname)\b/gi,
      ],
    };

    const url = request.url;
    const body = JSON.stringify(request.body || {});
    const query = JSON.stringify(request.query || {});
    const fullContent = `${url} ${body} ${query}`;

    for (const [attackType, patterns] of Object.entries(attackPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(fullContent)) {
          this.logger.error(
            `POTENTIAL ATTACK DETECTED [${requestId}] Type: ${attackType} - ` +
            `IP: ${request.ip} - URL: ${url} - Pattern: ${pattern.source}`
          );
          
          // Could throw error here to block the request
          // throw new BadRequestException('Potentially malicious request detected');
        }
      }
    }
  }

  private trackFailedAttempt(ip: string, request: Request, error: any): void {
    const now = Date.now();
    const entry = this.suspiciousAttempts.get(ip) || { count: 0, lastAttempt: now };
    
    // Reset count if last attempt was more than block duration ago
    const blockDuration = (this.options.blockDuration || 15) * 60 * 1000; // Convert to ms
    if (now - entry.lastAttempt > blockDuration) {
      entry.count = 0;
    }

    entry.count++;
    entry.lastAttempt = now;
    this.suspiciousAttempts.set(ip, entry);

    const maxFailedAttempts = this.options.maxFailedAttempts || 5;
    
    this.logger.warn(
      `FAILED ATTEMPT TRACKED [${request['requestId']}] IP: ${ip} - ` +
      `Count: ${entry.count}/${maxFailedAttempts} - URL: ${request.url} - Error: ${error.message}`
    );

    if (entry.count >= maxFailedAttempts) {
      this.logger.error(
        `IP BLOCKED [${request['requestId']}] IP: ${ip} - ` +
        `Exceeded maximum failed attempts (${maxFailedAttempts})`
      );
    }
  }

  private isBlocked(ip: string): boolean {
    const entry = this.suspiciousAttempts.get(ip);
    if (!entry) return false;

    const maxFailedAttempts = this.options.maxFailedAttempts || 5;
    const blockDuration = (this.options.blockDuration || 15) * 60 * 1000;
    const now = Date.now();

    return entry.count >= maxFailedAttempts && (now - entry.lastAttempt) < blockDuration;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    const blockDuration = (this.options.blockDuration || 15) * 60 * 1000;
    let cleanedCount = 0;

    for (const [ip, entry] of this.suspiciousAttempts.entries()) {
      if (now - entry.lastAttempt > blockDuration) {
        this.suspiciousAttempts.delete(ip);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Security cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  // Get security stats
  getSecurityStats(): any {
    const now = Date.now();
    const activeBlocks = Array.from(this.suspiciousAttempts.entries())
      .filter(([_, entry]) => this.isBlocked(_))
      .length;

    return {
      totalTrackedIPs: this.suspiciousAttempts.size,
      activeBlocks,
      recentAttempts: Array.from(this.suspiciousAttempts.entries())
        .filter(([_, entry]) => now - entry.lastAttempt < 300000) // Last 5 minutes
        .length,
    };
  }
}

/**
 * CORS interceptor for handling cross-origin requests with enhanced security
 */
@Injectable()
export class CorsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CorsInterceptor.name);

  constructor(private readonly options: {
    allowedOrigins?: string[];
    allowedMethods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  } = {}) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const origin = request.get('Origin');
    const requestId = request['requestId'] || 'unknown';

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      this.handlePreflightRequest(request, response, origin);
      response.status(204).send();
      return new Observable(subscriber => {
        subscriber.complete();
      });
    }

    // Set CORS headers for actual requests
    this.setCorsHeaders(request, response, origin);

    this.logger.debug(
      `CORS HEADERS SET [${requestId}] Origin: ${origin || 'none'} - Method: ${request.method}`
    );

    return next.handle();
  }

  private handlePreflightRequest(request: Request, response: Response, origin?: string): void {
    const requestMethod = request.get('Access-Control-Request-Method');
    const requestHeaders = request.get('Access-Control-Request-Headers');

    // Check if origin is allowed
    if (origin && this.isOriginAllowed(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    }

    // Set allowed methods
    const allowedMethods = this.options.allowedMethods || ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
    response.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));

    // Set allowed headers
    const allowedHeaders = this.options.allowedHeaders || [
      'Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'
    ];
    response.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));

    // Set credentials
    if (this.options.credentials) {
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Set max age for preflight cache
    const maxAge = this.options.maxAge || 86400; // 24 hours
    response.setHeader('Access-Control-Max-Age', maxAge.toString());

    this.logger.debug(
      `PREFLIGHT HANDLED - Origin: ${origin} - Method: ${requestMethod} - Headers: ${requestHeaders}`
    );
  }

  private setCorsHeaders(request: Request, response: Response, origin?: string): void {
    // Set origin header
    if (origin && this.isOriginAllowed(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      // No origin header means same-origin request
      response.setHeader('Access-Control-Allow-Origin', '*');
    }

    // Set credentials
    if (this.options.credentials) {
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Set exposed headers
    if (this.options.exposedHeaders) {
      response.setHeader('Access-Control-Expose-Headers', this.options.exposedHeaders.join(', '));
    }
  }

  private isOriginAllowed(origin: string): boolean {
    if (!this.options.allowedOrigins || this.options.allowedOrigins.length === 0) {
      return true; // Allow all origins if none specified
    }

    return this.options.allowedOrigins.some(allowedOrigin => {
      // Support wildcards
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(origin);
      }
      return allowedOrigin === origin;
    });
  }
}