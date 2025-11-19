# NestJS Interceptors Implementation

## Overview

This project demonstrates a comprehensive implementation of **NestJS Interceptors** - powerful components that can transform request/response data, add cross-cutting concerns like logging and caching, and enhance the overall functionality of your NestJS applications.

## What are Interceptors?

Interceptors are classes that implement the `NestInterceptor` interface and are executed **before and after** route handlers. They provide a way to:

- Transform the result returned from a function
- Transform the exception thrown from a function  
- Extend the basic function behavior
- Completely override a function depending on specific conditions

### Request Lifecycle Position

In the NestJS request lifecycle, interceptors are executed in this order:
```
Request → Middleware → Guards → Interceptors → Pipes → Controllers → Services → Interceptors → Exception Filters → Response
```

## Interceptors in This Project

Our implementation includes **6 specialized interceptors** that work together to provide comprehensive request/response processing:

### 1. 🔒 Security Interceptor (`security.interceptor.ts`)

**Purpose**: Adds security headers and monitors for potential threats

**Features**:
- **Security Headers**: CSP, XSS Protection, HSTS, Frame Options
- **Attack Detection**: SQL Injection, XSS, Path Traversal, Command Injection
- **IP Blocking**: Automatic blocking based on suspicious activity
- **Sensitive Route Monitoring**: Enhanced logging for auth endpoints

**Configuration**:
```typescript
new SecurityInterceptor({
  enableSecurityHeaders: true,
  detectSuspiciousActivity: true,
  maxFailedAttempts: 5,
  blockDuration: 15, // minutes
  sensitiveRoutes: ['/admin/', '/auth/']
})
```

**Security Headers Added**:
- Content-Security-Policy
- X-XSS-Protection  
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security

### 2. 🌐 CORS Interceptor (`security.interceptor.ts`)

**Purpose**: Handles Cross-Origin Resource Sharing with enhanced security

**Features**:
- **Origin Validation**: Wildcard and pattern-based origin matching
- **Preflight Handling**: Automatic OPTIONS request processing
- **Header Management**: Configurable allowed/exposed headers
- **Credentials Support**: Secure credential handling

**Configuration**:
```typescript
new CorsInterceptor({
  allowedOrigins: ['http://localhost:3000', 'https://*.yourdomain.com'],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
  maxAge: 86400
})
```

### 3. ⚡ Performance Interceptor (`performance.interceptor.ts`)

**Purpose**: Monitors and analyzes application performance

**Features**:
- **Request Timing**: Millisecond-precision duration tracking
- **Memory Monitoring**: Heap usage and memory leak detection
- **CPU Tracking**: User and system CPU usage per request
- **Performance Alerts**: Configurable thresholds for slow requests
- **Statistics Collection**: Percentiles, error rates, endpoint analytics

**Key Metrics Tracked**:
```typescript
interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
}
```

**Statistics Available**:
```typescript
getPerformanceStats(): {
  totalRequests: number;
  averageResponseTime: number;
  percentiles: { p50: number; p95: number; p99: number };
  slowRequests: number;
  errorRate: number;
  endpointStats: Record<string, EndpointStats>;
}
```

### 4. 📝 Logging Interceptor (`logging.interceptor.ts`)

**Purpose**: Comprehensive request/response logging with security monitoring

**Features**:
- **Request Logging**: Method, URL, headers, body (sanitized)
- **Response Logging**: Status code, headers, body, timing
- **Security Logging**: Failed attempts, suspicious patterns
- **Sensitive Data Filtering**: Automatic masking of passwords, tokens
- **Performance Integration**: Response time tracking

**Sensitive Fields Filtering**:
```typescript
private readonly sensitiveFields = [
  'password', 'token', 'authorization', 'secret', 
  'key', 'apikey', 'api_key', 'auth'
];
```

**Log Formats**:
```
REQUEST [uuid] POST /auth/login - IP: 127.0.0.1 - UserAgent: Mozilla/5.0...
RESPONSE [uuid] POST /auth/login - Status: 200 - Duration: 45ms
SECURITY ALERT [uuid] Multiple failed login attempts - IP: 192.168.1.1
```

### 5. 💾 Cache Interceptor (`cache.interceptor.ts`)

**Purpose**: Intelligent response caching with configurable rules

**Features**:
- **In-Memory Caching**: Fast response caching with TTL support
- **Cache Key Generation**: Flexible key generation strategies
- **Route-Based Rules**: Different TTL per endpoint
- **Cache Statistics**: Hit rates, memory usage, performance metrics
- **Automatic Cleanup**: TTL-based cache invalidation

**Cache Configuration**:
```typescript
new CacheInterceptor({
  ttl: 300, // 5 minutes default
  keyGenerator: (req) => `${req.method}-${req.url}`,
  excludeRoutes: ['/auth/', '/admin/'],
  shouldCache: (req, res) => res.statusCode === 200
})
```

### 6. ⏱️ Timeout & Rate Limiting Interceptors (`cache.interceptor.ts`)

**Purpose**: Request timeout management and rate limiting

**Timeout Features**:
- **Global Timeout**: Default timeout for all requests
- **Route-Specific Timeouts**: Different timeouts per endpoint
- **Timeout Logging**: Detailed timeout event logging

**Rate Limiting Features**:
- **IP-Based Limiting**: Requests per time window per IP
- **Route-Specific Rules**: Different limits per endpoint
- **Memory Storage**: In-memory request tracking
- **Sliding Window**: Accurate rate calculation

### 7. 🔄 Response Transform Interceptor (`response.interceptor.ts`)

**Purpose**: Standardizes API response format across all endpoints

**Features**:
- **Consistent Response Format**: Unified API response structure
- **Pagination Support**: Automatic pagination metadata
- **Error Normalization**: Consistent error response format
- **Metadata Injection**: Request ID, timestamp, version info

**Standard Response Format**:
```typescript
{
  success: true,
  data: any,
  message?: string,
  metadata: {
    requestId: string;
    timestamp: string;
    version: string;
    responseTime: number;
  },
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  }
}
```

## Implementation Examples

### Basic Interceptor Structure

```typescript
@Injectable()
export class ExampleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Before request processing
    console.log('Before...');
    
    return next.handle().pipe(
      tap(() => {
        // After request processing
        console.log('After...');
      })
    );
  }
}
```

### Using Interceptors

#### Method-Level Application
```typescript
@Controller('catalog')
export class CatalogController {
  @UseInterceptors(CacheInterceptor)
  @Get('products')
  getProducts() {
    return this.catalogService.getProducts();
  }
}
```

#### Global Application
```typescript
// app.module.ts
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

#### Controller-Level Application
```typescript
@UseInterceptors(SecurityInterceptor, PerformanceInterceptor)
@Controller('admin')
export class AdminController {
  // All methods use both interceptors
}
```

## Interceptors Module

The `InterceptorsModule` provides centralized configuration and management:

```typescript
@Global()
@Module({
  providers: [
    // All interceptors configured with APP_INTERCEPTOR
    // Execution order is important!
  ],
  exports: [/* all interceptors */],
})
export class InterceptorsModule {}
```

### Execution Order

The interceptors execute in this specific order:
1. **SecurityInterceptor** - Security headers and threat detection
2. **CorsInterceptor** - CORS handling  
3. **PerformanceInterceptor** - Performance monitoring
4. **LoggingInterceptor** - Request/response logging
5. **RateLimitInterceptor** - Rate limiting
6. **TimeoutInterceptor** - Request timeout
7. **CacheInterceptor** - Response caching
8. **ResponseTransformInterceptor** - Response standardization

## Advanced Usage Patterns

### Custom Cache Key Generation

```typescript
const cacheInterceptor = new CacheInterceptor({
  keyGenerator: (request) => {
    const userId = request.user?.id || 'anonymous';
    return `${userId}-${request.method}-${request.url}`;
  }
});
```

### Conditional Caching

```typescript
const cacheInterceptor = new CacheInterceptor({
  shouldCache: (request, response) => {
    return response.statusCode === 200 && 
           request.method === 'GET' && 
           !request.url.includes('/admin/');
  }
});
```

### Performance Monitoring with Alerts

```typescript
const performanceInterceptor = new PerformanceInterceptor({
  alertThresholds: {
    slow: 1000,     // 1 second
    verySlow: 5000, // 5 seconds  
    memory: 100     // 100 MB
  }
});

// Get performance stats
const stats = performanceInterceptor.getPerformanceStats();
console.log(`Average response time: ${stats.averageResponseTime}ms`);
console.log(`95th percentile: ${stats.percentiles.p95}ms`);
```

### Security Monitoring

```typescript
const securityInterceptor = new SecurityInterceptor({
  maxFailedAttempts: 3,
  blockDuration: 30, // minutes
  sensitiveRoutes: ['/admin/', '/api/users/']
});

// Get security statistics
const securityStats = securityInterceptor.getSecurityStats();
console.log(`Active blocks: ${securityStats.activeBlocks}`);
```

## Integration with Other Components

### With Exception Filters
Interceptors work seamlessly with exception filters. If an exception occurs, the interceptor's error handling logic executes before the exception filter:

```typescript
return next.handle().pipe(
  catchError((error) => {
    this.logger.error(`Request failed: ${error.message}`);
    // Error goes to exception filters next
    return throwError(() => error);
  })
);
```

### With Guards and Pipes
Interceptors execute after guards and before pipes in the request lifecycle:
```
Guards → Interceptors (before) → Pipes → Controller → Interceptors (after)
```

### With Middleware  
Middleware executes before guards and interceptors:
```
Middleware → Guards → Interceptors → Pipes → Controller
```

## Testing Interceptors

### Unit Testing

```typescript
describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should log request and response', async () => {
    const context = createMockExecutionContext();
    const next = createMockCallHandler();
    
    const result = interceptor.intercept(context, next);
    
    expect(result).toBeDefined();
    // Verify logging behavior
  });
});
```

### Integration Testing

```typescript
describe('Interceptors Integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [InterceptorsModule],
      controllers: [TestController],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should apply all interceptors in correct order', () => {
    return request(app.getHttpServer())
      .get('/test')
      .expect(200)
      .expect((res) => {
        expect(res.headers['x-request-id']).toBeDefined();
        expect(res.body.success).toBe(true);
      });
  });
});
```

## Performance Considerations

### Memory Usage
- **Cache Size**: Monitor cache size to prevent memory leaks
- **Metrics Storage**: Limit stored performance metrics
- **Cleanup**: Implement periodic cleanup for expired data

### CPU Impact
- **Minimal Processing**: Keep interceptor logic lightweight
- **Async Operations**: Use async processing where possible
- **Selective Application**: Apply intensive interceptors only where needed

### Best Practices

1. **Order Matters**: Arrange interceptors logically (security → logging → caching)
2. **Error Handling**: Always handle errors gracefully in interceptors
3. **Performance**: Monitor interceptor overhead, especially for high-traffic routes
4. **Configuration**: Make interceptors configurable for different environments
5. **Testing**: Thoroughly test interceptor combinations and edge cases

## Monitoring and Observability

### Health Check Integration

```typescript
@Injectable()
export class InterceptorsHealthIndicator extends HealthIndicator {
  check(key: string): HealthIndicatorResult {
    const performanceStats = /* get from performance interceptor */;
    const cacheStats = /* get from cache interceptor */;
    
    const isHealthy = performanceStats.averageResponseTime < 2000;
    
    return this.getStatus(key, isHealthy, {
      performance: performanceStats,
      cache: cacheStats,
    });
  }
}
```

### Metrics Export

```typescript
// Export metrics for external monitoring systems
app.get('/metrics', (req, res) => {
  const metrics = {
    performance: performanceInterceptor.getPerformanceStats(),
    cache: cacheInterceptor.getCacheStats(),
    security: securityInterceptor.getSecurityStats(),
  };
  res.json(metrics);
});
```

## Conclusion

This interceptors implementation provides a robust foundation for:
- **Security**: Comprehensive threat detection and prevention
- **Performance**: Detailed monitoring and optimization insights
- **Reliability**: Caching, timeouts, and rate limiting
- **Observability**: Extensive logging and metrics collection
- **Standards**: Consistent API response formats

The interceptors work together to create a production-ready NestJS application with enterprise-level cross-cutting concerns handled transparently and efficiently.

## Related Documentation

- [NestJS Guards](../security/README.md) - Authentication and Authorization
- [NestJS Middleware](../middleware/README.md) - Request preprocessing  
- [NestJS Exception Filters](../exception-filters/README.md) - Error handling
- [NestJS Pipes](../pipes/README.md) - Input validation and transformation