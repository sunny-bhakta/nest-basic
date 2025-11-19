# 🔧 NestJS Middleware Documentation

## 📋 Table of Contents

- [Overview](#-overview)
- [Middleware Components](#-middleware-components)
- [Architecture](#-architecture)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [Usage Examples](#-usage-examples)
- [Middleware Chain](#-middleware-chain)
- [Performance](#-performance)
- [Security](#-security)
- [Testing](#-testing)
- [Best Practices](#-best-practices)
- [Troubleshooting](#-troubleshooting)

## 🌟 Overview

This NestJS application includes a comprehensive middleware system that provides essential functionality for request processing, security, logging, rate limiting, and context management. The middleware stack is designed to be modular, configurable, and production-ready.

### Key Features
- **🔒 Security Headers**: Comprehensive security header management
- **📝 Request Logging**: Structured request/response logging with performance tracking
- **🎯 Request Context**: Centralized request context management
- **🚦 Rate Limiting**: Built-in rate limiting protection
- **⚡ Lifecycle Events**: Advanced event-driven request tracking
- **🔍 Distributed Tracing**: Request ID and correlation ID support

## 🧩 Middleware Components

### 1. 🔒 SecurityHeadersMiddleware
**File**: `src/middleware/security-headers.middleware.ts`

**Purpose**: Adds essential security headers to all HTTP responses

**Features**:
- CORS configuration
- XSS Protection
- Content Type Options
- Frame Options (Clickjacking protection)
- Content Security Policy (CSP)
- Referrer Policy
- Permissions Policy
- Server header removal

**Headers Set**:
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS
Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
```

### 2. 📝 LoggingMiddleware
**File**: `src/middleware/logging.middleware.ts`

**Purpose**: Provides comprehensive request/response logging with performance metrics

**Features**:
- Request ID generation and tracking
- Structured logging with emojis for readability
- Response time measurement
- Status code-based log levels
- Slow request detection (>1000ms)
- User information logging (when authenticated)
- IP address and User-Agent tracking

**Log Examples**:
```
🚀 [req-1700000000000-abc123] GET /api/users - 192.168.1.100 - Mozilla/5.0...
✅ [req-1700000000000-abc123] GET /api/users - 200 - 45ms - User: john.doe(ADMIN)
🐌 [req-1700000000000-abc123] Slow request detected: 1250ms
```

### 3. 🎯 RequestContextMiddleware
**File**: `src/middleware/request-context.middleware.ts`

**Purpose**: Enriches requests with context information and tracking data

**Features**:
- Request ID generation (if not set)
- Timestamp tracking
- Context object creation
- Client IP extraction with proxy support
- Response header injection (X-Request-ID)
- User context placeholder

**Context Object**:
```typescript
{
  requestId: 'req-1700000000000-abc123',
  startTime: 1700000000000,
  method: 'GET',
  url: '/api/users',
  userAgent: 'Mozilla/5.0...',
  ip: '192.168.1.100',
  user: null // Populated by authentication
}
```

### 4. 🚦 RateLimitMiddleware
**File**: `src/middleware/rate-limit.middleware.ts`

**Purpose**: Implements rate limiting to prevent abuse and ensure API stability

**Features**:
- Configurable rate limits (default: 100 requests per 15 minutes)
- Client identification by IP and User-Agent
- Sliding window implementation
- Rate limit headers
- Automatic cleanup of expired entries
- Customizable responses

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 2023-11-19T15:30:00.000Z
```

**Default Configuration**:
- Window: 15 minutes (900,000ms)
- Max Requests: 100 per window
- Response: 429 Too Many Requests

### 5. ⚡ LifecycleRequestMiddleware
**File**: `src/events/middleware/lifecycle-request.middleware.ts`

**Purpose**: Advanced middleware that integrates with the event-driven lifecycle system

**Features**:
- Request lifecycle event emission
- Enhanced context enrichment
- Correlation ID support
- Route intelligence
- Response monitoring
- Error event tracking
- Performance analytics

## 🏗️ Architecture

### Middleware Flow
```
┌─────────────────┐
│   HTTP Request  │
└─────────┬───────┘
          │
┌─────────▼───────┐
│ SecurityHeaders │ ← CORS, Security Headers
│   Middleware    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│ RequestContext  │ ← Request ID, Context
│   Middleware    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   RateLimit     │ ← Rate Limiting
│   Middleware    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│    Logging      │ ← Request Logging
│   Middleware    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│LifecycleRequest │ ← Event Emission (Optional)
│   Middleware    │
└─────────┬───────┘
          │
┌─────────▼───────┐
│     Guards      │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Controllers   │
└─────────────────┘
```

### Module Structure
```
src/middleware/
├── index.ts                          # Exports all middleware
├── middleware.module.ts              # Module definition
├── logging.middleware.ts             # Request/response logging
├── logging.middleware.spec.ts        # Tests
├── request-context.middleware.ts     # Context management
├── request-context.middleware.spec.ts # Tests
├── rate-limit.middleware.ts          # Rate limiting
├── rate-limit.middleware.spec.ts     # Tests
├── security-headers.middleware.ts    # Security headers
└── security-headers.middleware.spec.ts # Tests

src/events/middleware/
├── lifecycle-request.middleware.ts   # Event-driven middleware
├── lifecycle-request.middleware.spec.ts # Tests
└── README.md                         # Detailed documentation
```

## 📦 Installation & Setup

### 1. Basic Setup

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { 
  SecurityHeadersMiddleware,
  RequestContextMiddleware,
  RateLimitMiddleware,
  LoggingMiddleware,
  MiddlewareModule
} from './middleware';

@Module({
  imports: [
    MiddlewareModule, // Import middleware module
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        SecurityHeadersMiddleware,    // 1. Security first
        RequestContextMiddleware,    // 2. Context setup
        RateLimitMiddleware,         // 3. Rate limiting
        LoggingMiddleware,           // 4. Request logging
      )
      .forRoutes('*'); // Apply to all routes
  }
}
```

### 2. With Events Integration

```typescript
// app.module.ts
import { EventsModule } from './events/events.module';
import { LifecycleRequestMiddleware } from './events/middleware';

@Module({
  imports: [
    MiddlewareModule,
    EventsModule.forRoot({
      enableLogging: true,
      enableMetrics: true,
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        SecurityHeadersMiddleware,
        RequestContextMiddleware,
        RateLimitMiddleware,
        LoggingMiddleware,
        LifecycleRequestMiddleware, // Add lifecycle events
      )
      .forRoutes('*');
  }
}
```

### 3. Route-Specific Configuration

```typescript
// Apply middleware to specific routes
consumer
  .apply(SecurityHeadersMiddleware)
  .forRoutes('*') // All routes get security headers
  .apply(RateLimitMiddleware)
  .exclude(
    { path: 'health', method: RequestMethod.GET },
    { path: 'metrics', method: RequestMethod.GET },
  )
  .forRoutes('api/*') // Only API routes get rate limiting
  .apply(LoggingMiddleware)
  .exclude('health', 'metrics')
  .forRoutes('*'); // All routes except health/metrics get logging
```

## ⚙️ Configuration

### Environment Variables

```bash
# Logging Configuration
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true
SLOW_REQUEST_THRESHOLD=1000

# Rate Limiting Configuration  
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window
RATE_LIMIT_SKIP_FAILED_REQUESTS=false
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Security Headers Configuration
CORS_ORIGIN=*
CSP_POLICY=default-src 'self'
ENABLE_SECURITY_HEADERS=true

# Request Context Configuration
REQUEST_ID_PREFIX=req
ENABLE_REQUEST_TRACKING=true
CLIENT_IP_HEADER=x-forwarded-for
```

### Programmatic Configuration

```typescript
// Custom rate limiting configuration
@Injectable()
export class CustomRateLimitMiddleware extends RateLimitMiddleware {
  constructor() {
    super();
    this.windowMs = 10 * 60 * 1000; // 10 minutes
    this.maxRequests = 50; // 50 requests per window
  }
}

// Custom security headers
@Injectable()  
export class CustomSecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Custom CORS configuration
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
    const origin = req.headers.origin;
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    // Custom CSP
    res.header(
      'Content-Security-Policy',
      process.env.CSP_POLICY || "default-src 'self'"
    );
    
    next();
  }
}
```

## 📖 Usage Examples

### 1. Accessing Request Context

```typescript
// In controllers, access enriched request context
@Controller('users')
export class UsersController {
  @Get()
  findAll(@Req() request: Request) {
    const requestId = request['requestId'];
    const context = request['context'];
    const startTime = request['startTime'];
    
    console.log(`Processing request ${requestId}`);
    console.log(`Client IP: ${context.ip}`);
    console.log(`User Agent: ${context.userAgent}`);
    
    return this.usersService.findAll();
  }
  
  @Post()
  create(@Req() request: Request, @Body() userData: any) {
    const requestId = request['requestId'];
    
    // Pass request ID to service for logging
    return this.usersService.create(userData, { requestId });
  }
}
```

### 2. Custom Logging Integration

```typescript
// Service with integrated logging
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  async findAll(context?: { requestId?: string }) {
    const requestId = context?.requestId || 'unknown';
    
    this.logger.log(`[${requestId}] Fetching all users`);
    
    try {
      const users = await this.userRepository.find();
      this.logger.log(`[${requestId}] Found ${users.length} users`);
      return users;
    } catch (error) {
      this.logger.error(`[${requestId}] Error fetching users: ${error.message}`);
      throw error;
    }
  }
}
```

### 3. Rate Limit Handling

```typescript
// Custom rate limit exception handler
@Catch(HttpException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    
    if (exception.getStatus() === 429) {
      const retryAfter = response.getHeader('X-RateLimit-Reset');
      
      response.status(429).json({
        statusCode: 429,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'Too Many Requests',
        retryAfter: retryAfter,
        requestId: request['requestId'],
      });
    }
  }
}
```

### 4. Security Headers Customization

```typescript
// Environment-specific security configuration
@Injectable()
export class EnvironmentSecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isDevelopment) {
      // Relaxed security for development
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval'");
    } else if (isProduction) {
      // Strict security for production
      res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL);
      res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      res.header('Content-Security-Policy', "default-src 'self'; script-src 'self'");
    }
    
    next();
  }
}
```

## 🔗 Middleware Chain

### Recommended Order

```typescript
// Optimal middleware ordering for maximum effectiveness
consumer
  .apply(
    // 1. Security (CORS, Headers) - First for all requests
    SecurityHeadersMiddleware,
    
    // 2. Context Setup - Early for request tracking
    RequestContextMiddleware,
    
    // 3. Rate Limiting - Before expensive operations
    RateLimitMiddleware,
    
    // 4. Logging - After context setup, before business logic
    LoggingMiddleware,
    
    // 5. Lifecycle Events - For advanced monitoring (optional)
    LifecycleRequestMiddleware,
    
    // 6. Compression - For response optimization
    CompressionMiddleware,
    
    // 7. Static Files - For serving static content
    ServeStaticMiddleware,
  )
  .forRoutes('*');
```

### Chain Dependencies

```
SecurityHeaders → RequestContext → RateLimit → Logging → Lifecycle
     ↓                ↓              ↓           ↓          ↓
Sets CORS      Creates RequestID   Uses IP    Uses ReqID  Uses Context
& Headers      & Context          & UserAgent              & Events
```

## ⚡ Performance

### Performance Metrics

| Middleware | Avg Overhead | Memory Usage | CPU Impact |
|------------|-------------|--------------|------------|
| SecurityHeaders | <1ms | Minimal | Very Low |
| RequestContext | <2ms | Low | Low |
| RateLimit | <3ms | Medium | Medium |
| Logging | <2ms | Low | Low |
| Lifecycle | <5ms | Medium | Medium |

### Optimization Tips

```typescript
// 1. Conditional middleware application
if (process.env.NODE_ENV !== 'test') {
  consumer.apply(LoggingMiddleware).forRoutes('*');
}

// 2. Route-specific optimization
consumer
  .apply(RateLimitMiddleware)
  .exclude('health', 'metrics', 'static/*')
  .forRoutes('api/*');

// 3. Async processing for non-critical tasks
@Injectable()
export class OptimizedLoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Immediate processing
    const startTime = Date.now();
    req['requestId'] = generateRequestId();
    
    // Async logging (non-blocking)
    setImmediate(() => {
      this.logRequest(req);
    });
    
    res.on('finish', () => {
      // Async response logging
      setImmediate(() => {
        this.logResponse(req, res, Date.now() - startTime);
      });
    });
    
    next(); // Don't wait for logging
  }
}
```

## 🔒 Security

### Security Features

#### 1. CORS Protection
```typescript
// Configurable CORS with environment-specific origins
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
res.header('Access-Control-Allow-Origin', origin);
```

#### 2. Rate Limiting
```typescript
// IP-based rate limiting with sliding window
const clientIdentifier = `${ip}:${userAgent}`;
if (requestCount > maxRequests) {
  throw new HttpException('Too Many Requests', 429);
}
```

#### 3. Header Sanitization
```typescript
// Remove sensitive server information
res.removeHeader('X-Powered-By');
res.removeHeader('Server');
```

#### 4. Content Security Policy
```typescript
// Prevent XSS and injection attacks
res.header('Content-Security-Policy', "default-src 'self'; script-src 'self'");
```

### Security Best Practices

```typescript
// 1. Environment-specific CORS
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? process.env.PRODUCTION_ORIGINS?.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

// 2. Secure headers in production
if (process.env.NODE_ENV === 'production') {
  res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.header('X-Content-Type-Options', 'nosniff');
}

// 3. Rate limit by user (when authenticated)
const rateLimitKey = req.user?.id || req.ip;

// 4. Content type validation
if (req.method === 'POST' && !req.is('application/json')) {
  throw new HttpException('Invalid Content-Type', 400);
}
```

## 🧪 Testing

### Unit Testing

```typescript
// Example: Testing SecurityHeadersMiddleware
describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new SecurityHeadersMiddleware();
    mockRequest = { method: 'GET' };
    mockResponse = {
      header: jest.fn(),
      removeHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should set security headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(mockResponse.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should handle OPTIONS requests', () => {
    mockRequest.method = 'OPTIONS';
    
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(mockResponse.end).toHaveBeenCalled();
    expect(nextFunction).not.toHaveBeenCalled();
  });
});
```

### Integration Testing

```typescript
// Example: Testing middleware chain
describe('Middleware Chain Integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should apply all middleware in correct order', () => {
    return request(app.getHttpServer())
      .get('/api/users')
      .expect((res) => {
        // Security headers should be present
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-frame-options']).toBe('DENY');
        
        // Request ID should be present
        expect(res.headers['x-request-id']).toBeDefined();
        
        // Rate limit headers should be present
        expect(res.headers['x-ratelimit-limit']).toBeDefined();
        expect(res.headers['x-ratelimit-remaining']).toBeDefined();
      });
  });
});
```

## 💡 Best Practices

### 1. Middleware Ordering
```typescript
// ✅ Correct order: Security → Context → Limiting → Logging
consumer.apply(
  SecurityHeadersMiddleware,    // First: Set security headers
  RequestContextMiddleware,    // Second: Create request context
  RateLimitMiddleware,         // Third: Apply rate limiting
  LoggingMiddleware,           // Fourth: Log requests
).forRoutes('*');

// ❌ Incorrect order: Logging before context
consumer.apply(
  LoggingMiddleware,           // Bad: No request ID available
  RequestContextMiddleware,    // Context created after logging
);
```

### 2. Error Handling
```typescript
// ✅ Graceful error handling
@Injectable()
export class RobustMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Middleware logic
      this.processRequest(req, res);
      next();
    } catch (error) {
      // Log error but don't break the chain
      console.error('Middleware error:', error);
      next(); // Continue processing
    }
  }
}

// ❌ Unhandled errors can break the request
@Injectable()
export class BritileMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // This could throw and break the request
    const data = JSON.parse(req.body);
    next();
  }
}
```

### 3. Performance Optimization
```typescript
// ✅ Efficient rate limiting with cleanup
@Injectable()
export class EfficientRateLimitMiddleware implements NestMiddleware {
  private store = new Map();
  private cleanupInterval: NodeJS.Timer;

  constructor() {
    // Automatic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }
}

// ❌ Memory leaks from no cleanup
@Injectable()  
export class LeakyRateLimitMiddleware implements NestMiddleware {
  private store = {}; // Will grow indefinitely
  
  use(req: Request, res: Response, next: NextFunction): void {
    const key = req.ip;
    this.store[key] = (this.store[key] || 0) + 1; // Never cleaned up
    next();
  }
}
```

### 4. Configuration Management
```typescript
// ✅ Environment-based configuration
@Injectable()
export class ConfigurableMiddleware implements NestMiddleware {
  private readonly config = {
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true',
    }
  };
}

// ❌ Hard-coded configuration
@Injectable()
export class HardCodedMiddleware implements NestMiddleware {
  private readonly maxRequests = 100; // Not configurable
  private readonly corsOrigin = '*';  // Not environment-specific
}
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Missing Request ID
**Problem**: Request ID is not available in controllers
```typescript
// Request ID is undefined
console.log(req['requestId']); // undefined
```

**Solutions**:
```typescript
// ✅ Ensure RequestContextMiddleware is applied first
consumer.apply(RequestContextMiddleware).forRoutes('*');

// ✅ Check middleware order
consumer.apply(
  SecurityHeadersMiddleware,
  RequestContextMiddleware,  // Must come before middleware that use requestId
  LoggingMiddleware,         // Uses requestId
);

// ✅ Add fallback in consuming middleware
const requestId = req['requestId'] || `fallback-${Date.now()}`;
```

#### 2. Rate Limiting Not Working
**Problem**: Rate limits are not being enforced

**Solutions**:
```typescript
// ✅ Check client identification
private getClientIdentifier(req: Request): string {
  // Ensure consistent client identification
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || 'unknown';
  return `${ip}:${userAgent}`;
}

// ✅ Verify rate limit store
console.log('Rate limit store:', this.store);

// ✅ Check window expiration logic
if (now > clientData.resetTime) {
  clientData.count = 0;
  clientData.resetTime = now + this.windowMs;
}
```

#### 3. CORS Issues
**Problem**: CORS errors in browser

**Solutions**:
```typescript
// ✅ Environment-specific CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'development'
  ? ['http://localhost:3000', 'http://localhost:3001']
  : process.env.CORS_ORIGINS?.split(',');

// ✅ Handle OPTIONS requests
if (req.method === 'OPTIONS') {
  res.header('Access-Control-Max-Age', '86400');
  res.status(200).end();
  return;
}

// ✅ Check request origin
const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.header('Access-Control-Allow-Origin', origin);
}
```

#### 4. Performance Issues
**Problem**: Middleware causing slow response times

**Solutions**:
```typescript
// ✅ Profile middleware performance
const startTime = process.hrtime();
// ... middleware logic ...
const [seconds, nanoseconds] = process.hrtime(startTime);
const duration = seconds * 1000 + nanoseconds / 1000000;
if (duration > 10) {
  console.warn(`Slow middleware: ${duration}ms`);
}

// ✅ Optimize rate limit store
// Use Map instead of Object for better performance
private store = new Map<string, RateLimitData>();

// ✅ Implement efficient cleanup
private cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, data] of this.store.entries()) {
    if (now > data.resetTime) {
      this.store.delete(key);
    }
  }
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```bash
# Environment variable
DEBUG=middleware:*

# Or specific middleware
DEBUG=middleware:rate-limit,middleware:logging
```

```typescript
// Debug logging in middleware
@Injectable()
export class DebuggableMiddleware implements NestMiddleware {
  private readonly debug = require('debug')('middleware:custom');
  
  use(req: Request, res: Response, next: NextFunction): void {
    this.debug('Processing request:', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next();
  }
}
```

### Health Checks

Implement health checks for middleware:

```typescript
@Controller('health')
export class HealthController {
  @Get('middleware')
  checkMiddleware(@Req() req: Request) {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      middleware: {
        requestId: !!req['requestId'],
        context: !!req['context'],
        startTime: !!req['startTime'],
      }
    };
  }
}
```

---

## 📄 Related Documentation

- [Individual Middleware Components](./src/middleware/)
  - [Security Headers Middleware](./src/middleware/security-headers.middleware.ts)
  - [Request Context Middleware](./src/middleware/request-context.middleware.ts)
  - [Rate Limit Middleware](./src/middleware/rate-limit.middleware.ts)
  - [Logging Middleware](./src/middleware/logging.middleware.ts)
- [Lifecycle Events Middleware](./src/events/middleware/README.md)
- [Guards Documentation](./src/guards/README.md)
- [Filters Documentation](./src/filters/README.md)

## 🤝 Contributing

When contributing to the middleware system:

1. **Follow the established patterns**
2. **Add comprehensive tests**
3. **Update this documentation**
4. **Consider performance implications**
5. **Maintain security standards**

## 📝 License

This middleware system is part of the NestJS application and follows the same license terms as the main project.