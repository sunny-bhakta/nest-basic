import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './logging.interceptor';
import { ResponseTransformInterceptor } from './response.interceptor';
import { CacheInterceptor, TimeoutInterceptor, RateLimitInterceptor } from './cache.interceptor';
import { SecurityInterceptor, CorsInterceptor } from './security.interceptor';
import { PerformanceInterceptor } from './performance.interceptor';

/**
 * Interceptors module that provides all application interceptors
 * Order of interceptors matters - they execute in the order they are provided
 * 
 * Execution order:
 * 1. SecurityInterceptor - Security headers and threat detection
 * 2. CorsInterceptor - CORS handling
 * 3. PerformanceInterceptor - Performance monitoring
 * 4. LoggingInterceptor - Request/response logging
 * 5. RateLimitInterceptor - Rate limiting
 * 6. TimeoutInterceptor - Request timeout
 * 7. CacheInterceptor - Response caching
 * 8. ResponseTransformInterceptor - Response standardization (last)
 */
@Global()
@Module({
  providers: [
    // Individual interceptor instances
    LoggingInterceptor,
    ResponseTransformInterceptor,
    CacheInterceptor,
    TimeoutInterceptor,
    RateLimitInterceptor,
    SecurityInterceptor,
    CorsInterceptor,
    PerformanceInterceptor,
    
    // Global interceptors (order matters!)
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new SecurityInterceptor({
        enableSecurityHeaders: true,
        detectSuspiciousActivity: true,
        maxFailedAttempts: 5,
        blockDuration: 15, // minutes
        sensitiveRoutes: [
          '/admin/',
          '/auth/',
          '/login',
          '/password',
          '/reset',
          '/api/admin/',
          '/api/auth/',
        ],
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new CorsInterceptor({
        allowedOrigins: [
          'http://localhost:3000',
          'http://localhost:4200',
          'https://*.yourdomain.com',
        ],
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'Accept',
          'Origin',
          'X-Request-ID',
        ],
        exposedHeaders: ['X-Request-ID', 'X-Response-Time'],
        credentials: true,
        maxAge: 86400, // 24 hours
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new PerformanceInterceptor({
        enableMetricsCollection: true,
        enableSlowRequestLogging: true,
        enableMemoryMonitoring: true,
        enableCpuMonitoring: true,
        timeoutMs: 30000, // 30 seconds
        alertThresholds: {
          slow: 1000, // 1 second
          verySlow: 5000, // 5 seconds
          memory: 100, // 100 MB
        },
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new RateLimitInterceptor({
        windowMs: 60000, // 1 minute
        maxRequests: 100,
        skipSuccessfulRequests: false,
        keyGenerator: (req) => req.ip || 'unknown',
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new TimeoutInterceptor({
        timeout: 30000, // 30 seconds default timeout
        routeTimeouts: {
          '/upload/': 300000, // 5 minutes for uploads
          '/report/': 120000, // 2 minutes for reports
          '/search': 10000, // 10 seconds for search
        },
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: () => new CacheInterceptor({
        ttl: 300, // 5 minutes default TTL
        keyGenerator: (req) => `${req.method}-${req.url}`,
        excludeRoutes: ['/auth/', '/admin/'],
      }),
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
  exports: [
    LoggingInterceptor,
    ResponseTransformInterceptor,
    CacheInterceptor,
    TimeoutInterceptor,
    RateLimitInterceptor,
    SecurityInterceptor,
    CorsInterceptor,
    PerformanceInterceptor,
  ],
})
export class InterceptorsModule {
  /**
   * Get performance statistics from all interceptors
   */
  static getStats(): any {
    // This would typically be implemented with dependency injection
    // For now, returning a placeholder structure
    return {
      performance: {}, // PerformanceInterceptor stats
      cache: {}, // CacheInterceptor stats  
      rateLimit: {}, // RateLimitInterceptor stats
      security: {}, // SecurityInterceptor stats
      logging: {}, // LoggingInterceptor stats
    };
  }

  /**
   * Clear all interceptor caches and metrics
   */
  static clearCaches(): void {
    // This would typically clear caches from all interceptors
    console.log('Clearing interceptor caches...');
  }

  /**
   * Get interceptor configuration
   */
  static getConfiguration(): any {
    return {
      interceptors: [
        'SecurityInterceptor',
        'CorsInterceptor', 
        'PerformanceInterceptor',
        'LoggingInterceptor',
        'RateLimitInterceptor',
        'TimeoutInterceptor',
        'CacheInterceptor',
        'ResponseTransformInterceptor',
      ],
      executionOrder: 'Security → CORS → Performance → Logging → RateLimit → Timeout → Cache → ResponseTransform',
      description: 'Complete interceptor pipeline for request/response processing',
    };
  }
}

/**
 * Configuration interface for interceptors module
 */
export interface InterceptorsModuleConfig {
  security?: {
    enableSecurityHeaders?: boolean;
    detectSuspiciousActivity?: boolean;
    maxFailedAttempts?: number;
    blockDuration?: number;
    sensitiveRoutes?: string[];
  };
  cors?: {
    allowedOrigins?: string[];
    allowedMethods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    credentials?: boolean;
    maxAge?: number;
  };
  performance?: {
    enableMetricsCollection?: boolean;
    enableSlowRequestLogging?: boolean;
    timeoutMs?: number;
    alertThresholds?: {
      slow?: number;
      verySlow?: number;
      memory?: number;
    };
  };
  logging?: {
    enableRequestLogging?: boolean;
    enableResponseLogging?: boolean;
    logLevel?: string;
    maxBodyLength?: number;
    sensitiveFields?: string[];
  };
  rateLimit?: {
    windowMs?: number;
    maxRequests?: number;
    rateLimitRules?: Array<{
      pattern: string;
      windowMs: number;
      maxRequests: number;
    }>;
  };
  cache?: {
    ttl?: number;
    maxSize?: number;
    enableCaching?: boolean;
    cacheRules?: Array<{
      pattern: string;
      ttl: number;
      methods: string[];
    }>;
  };
}