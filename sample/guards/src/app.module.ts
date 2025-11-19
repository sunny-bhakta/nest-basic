import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { SecurityModule } from './security/security.module';
import { InterceptorsModule } from './interceptors/interceptors.module';
import { EventsModule } from './events/events.module';
import { LoggingMiddleware } from './middleware/logging.middleware';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';
import { LifecycleRequestMiddleware } from './events/middleware/lifecycle-request.middleware';
import { ControllersModule } from './controllers/controllers.module';

@Module({
  imports: [
    SecurityModule,
    EventsModule.forRoot({
      enableLogging: true,
      enableMetrics: true,
      enableSecurity: true,
      logLevel: 'log',
      metricsRetention: 24, // 24 hours
      securityThresholds: {
        authFailuresPerHour: 50,
        authzDenialsPerHour: 20,
        validationFailuresPerHour: 100,
      },
    }),
    // ControllersModule,
    // CatalogModule,
    // InterceptorsModule, // Add interceptors module for comprehensive request/response processing
  ],
  controllers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Configure middleware in order of execution
    // Complete Request Processing Pipeline:
    // 1. Middleware (configured below)
    // 2. Guards (Bearer token auth, access level checks)
    // 3. Interceptors (security, logging, caching, performance - via InterceptorsModule)
    // 4. Pipes (validation, transformation - integrated with controllers)
    // 5. Controllers & Services
    // 6. Interceptors (response transformation)  
    // 7. Exception Filters (error handling)
    consumer
      .apply(
        SecurityHeadersMiddleware,    // 1st: Set security headers (CORS, CSP, etc.)
        RequestContextMiddleware,    // 2nd: Add request context and ID
        RateLimitMiddleware,         // 3rd: Apply rate limiting
        LoggingMiddleware,           // 4th: Log requests (after context is set)
        LifecycleRequestMiddleware,  // 5th: Emit lifecycle events for monitoring
      )
      .forRoutes('*'); // Apply to all routes
    
    // You can also apply middleware to specific routes:
    // .forRoutes(
    //   { path: 'catalog', method: RequestMethod.GET },
    //   { path: 'auth', method: RequestMethod.POST }
    // );
  }
}
