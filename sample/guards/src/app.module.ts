import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { SecurityModule } from './security/security.module';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';

@Module({
  imports: [
    SecurityModule,
    CatalogModule
  ],
  controllers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Configure middleware in order of execution
    consumer
      .apply(
        SecurityHeadersMiddleware,    // 1st: Set security headers (CORS, CSP, etc.)
        RequestContextMiddleware,    // 2nd: Add request context and ID
        RateLimitMiddleware,         // 3rd: Apply rate limiting
        LoggingMiddleware,           // 4th: Log requests (after context is set)
      )
      .forRoutes('*'); // Apply to all routes
    
    // You can also apply middleware to specific routes:
    // .forRoutes(
    //   { path: 'catalog', method: RequestMethod.GET },
    //   { path: 'auth', method: RequestMethod.POST }
    // );
  }
}
