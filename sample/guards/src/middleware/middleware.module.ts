import { Module } from '@nestjs/common';
import { LoggingMiddleware } from './logging.middleware';
import { RequestContextMiddleware } from './request-context.middleware';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { SecurityHeadersMiddleware } from './security-headers.middleware';

@Module({
  providers: [
    LoggingMiddleware,
    RequestContextMiddleware, 
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
  ],
  exports: [
    LoggingMiddleware,
    RequestContextMiddleware,
    RateLimitMiddleware, 
    SecurityHeadersMiddleware,
  ],
})
export class MiddlewareModule {}