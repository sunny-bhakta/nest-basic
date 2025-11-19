# 🔧 Lifecycle Request Middleware Documentation

## Overview

The `LifecycleRequestMiddleware` is an enhanced NestJS middleware that integrates with the Request Lifecycle Events system to provide comprehensive request tracking, context enrichment, and automatic event emission throughout the request lifecycle.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [Usage Examples](#-usage-examples)
- [API Reference](#-api-reference)
- [Event Emission](#-event-emission)
- [Context Enrichment](#-context-enrichment)
- [Security Features](#-security-features)
- [Performance Monitoring](#-performance-monitoring)
- [Error Handling](#-error-handling)
- [Best Practices](#-best-practices)
- [Troubleshooting](#-troubleshooting)

## 🚀 Features

### Core Features
- **🔍 Request Tracking**: Automatic generation of unique request IDs for traceability
- **🔗 Correlation ID Management**: Support for distributed tracing across microservices
- **📝 Context Enrichment**: Automatic extraction and enrichment of request context
- **📡 Event Emission**: Automatic emission of lifecycle events at key points
- **🔒 Security Headers**: Sanitization of sensitive headers for secure logging
- **⚡ Performance Tracking**: Built-in response time and performance monitoring
- **🛡️ Error Handling**: Comprehensive error tracking and event emission

### Advanced Features
- **👤 User Context**: Automatic extraction of user information from multiple sources
- **🎯 Route Intelligence**: Smart extraction of controller and handler information
- **💾 Session Management**: Support for session tracking and management
- **🔄 Response Monitoring**: Complete response lifecycle tracking
- **📊 Compression Analysis**: Response compression ratio calculation
- **🗄️ Cache Integration**: Cache status monitoring and reporting

## 🏗️ Architecture

### Request Flow
```
┌─────────────────┐
│   HTTP Request  │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Middleware    │ ← LifecycleRequestMiddleware
│   - Generate ID │
│   - Enrich Ctx  │
│   - Emit Events │
└─────────┬───────┘
          │
┌─────────▼───────┐
│     Guards      │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Controllers   │
└─────────┬───────┘
          │
┌─────────▼───────┐
│    Services     │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   HTTP Response │ ← Response Event Emission
└─────────────────┘
```

### Event Timeline
```
Request Start → Context Enrichment → Route Detection → Response Monitoring → Request Complete
     ↓                 ↓                  ↓                    ↓                   ↓
REQUEST_START    Context Added    Controller/Handler    Response Headers    RESPONSE_SENT
   Event           to Request         Identified         & Status Code        Event
```

## 📦 Installation & Setup

### 1. Basic Integration

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LifecycleRequestMiddleware } from './events/middleware/lifecycle-request.middleware';

@Module({
  imports: [
    EventsModule.forRoot({
      enableLogging: true,
      enableMetrics: true,
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LifecycleRequestMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
```

### 2. Middleware Chain Integration

```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        // Security middleware first
        SecurityHeadersMiddleware,
        CorsMiddleware,
        
        // Lifecycle middleware for event emission
        LifecycleRequestMiddleware,
        
        // Logging and monitoring
        LoggingMiddleware,
        RateLimitMiddleware,
      )
      .forRoutes('*');
  }
}
```

### 3. Route-Specific Configuration

```typescript
// Apply to specific routes
consumer
  .apply(LifecycleRequestMiddleware)
  .exclude(
    { path: 'health', method: RequestMethod.GET },
    { path: 'metrics', method: RequestMethod.GET },
  )
  .forRoutes(
    { path: 'api/*', method: RequestMethod.ALL },
    UsersController,
    OrdersController,
  );
```

## ⚙️ Configuration

### Environment Variables

```bash
# Request ID Configuration
REQUEST_ID_PREFIX=req
CORRELATION_ID_PREFIX=corr

# Security Configuration
SANITIZE_HEADERS=true
SENSITIVE_HEADERS=authorization,cookie,x-api-key,x-auth-token

# Performance Configuration
TRACK_COMPRESSION=true
TRACK_CACHE_STATUS=true
ENABLE_ROUTE_EXTRACTION=true

# Logging Configuration
LOG_LEVEL=info
LOG_REQUESTS=true
LOG_RESPONSES=true
```

### Module Configuration

```typescript
// events.module.ts
EventsModule.forRoot({
  middleware: {
    enableRequestTracking: true,
    enableResponseTracking: true,
    enablePerformanceTracking: true,
    requestIdPrefix: 'req',
    correlationIdPrefix: 'corr',
    sanitizeHeaders: true,
    sensitiveHeaders: [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ],
  },
})
```

## 📖 Usage Examples

### Basic Usage

```typescript
// The middleware automatically handles all requests
// No additional code required in controllers

@Controller('users')
export class UsersController {
  @Get()
  findAll(@Req() request: Request) {
    // Request context is automatically enriched
    const requestId = request['requestId'];
    const correlationId = request['correlationId'];
    const startTime = request['startTime'];
    
    console.log(`Processing request ${requestId}`);
    
    return this.usersService.findAll();
  }
}
```

### Advanced Context Usage

```typescript
@Controller('orders')
export class OrdersController {
  @Post()
  @UseGuards(AuthGuard)
  async createOrder(
    @Req() request: ExtendedRequest,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    // Access enriched context
    const context = {
      requestId: request['requestId'],
      correlationId: request['correlationId'],
      userId: request.user?.id,
      ip: request['clientIP'],
      userAgent: request.get('User-Agent'),
    };
    
    // Use context in business logic
    const order = await this.ordersService.create(
      createOrderDto,
      context,
    );
    
    return order;
  }
}
```

### Custom Event Emission

```typescript
@Injectable()
export class CustomService {
  constructor(
    private readonly eventEmitter: LifecycleEventEmitter,
  ) {}
  
  async processPayment(request: ExtendedRequest, paymentData: any) {
    const requestId = request['requestId'];
    
    try {
      // Emit custom processing event
      this.eventEmitter.emitProcessingEvent({
        requestId,
        ip: request['clientIP'],
        action: 'start',
        controller: 'PaymentController',
        handler: 'processPayment',
      });
      
      const result = await this.paymentProcessor.process(paymentData);
      
      // Emit completion event
      this.eventEmitter.emitProcessingEvent({
        requestId,
        ip: request['clientIP'],
        action: 'complete',
        controller: 'PaymentController',
        handler: 'processPayment',
        duration: Date.now() - request['startTime'],
      });
      
      return result;
    } catch (error) {
      // Emit error event
      this.eventEmitter.emitErrorEvent({
        requestId,
        ip: request['clientIP'],
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        phase: 'service',
        context: { paymentData },
      });
      
      throw error;
    }
  }
}
```

## 📚 API Reference

### LifecycleRequestMiddleware

#### Constructor
```typescript
constructor(private readonly eventEmitter: LifecycleEventEmitter)
```

#### Methods

##### `use(req: ExtendedRequest, res: Response, next: NextFunction): void`
Main middleware function that processes incoming requests.

**Parameters:**
- `req`: Extended Express request object
- `res`: Express response object  
- `next`: Next function in middleware chain

**Request Enrichment:**
```typescript
interface EnrichedRequest extends Request {
  requestId: string;           // Unique request identifier
  correlationId: string;       // Distributed tracing ID
  startTime: number;           // Request start timestamp
  clientIP: string;            // Client IP address
  user?: any;                  // User object (if authenticated)
  sessionID?: string;          // Session identifier
}
```

### Private Methods

#### `generateRequestId(): string`
Generates unique request identifiers.

**Format:** `req-{timestamp}-{randomString}`

**Example:** `req-1700000000000-abc123def`

#### `generateCorrelationId(): string`
Generates correlation IDs for distributed tracing.

**Format:** `corr-{timestamp}-{randomString}`

**Example:** `corr-1700000000000-xyz789ghi`

#### `getClientIP(req: ExtendedRequest): string`
Extracts client IP from various headers and connection information.

**Priority Order:**
1. `x-forwarded-for` header
2. `x-real-ip` header  
3. `connection.remoteAddress`
4. `socket.remoteAddress`
5. 'unknown' (fallback)

#### `extractUserId(req: ExtendedRequest): string | undefined`
Extracts user ID from multiple possible locations.

**Sources:**
- `req.user.id`
- `req.user.userId`
- `req.user.sub` (JWT standard)
- `x-user-id` header

#### `extractSessionId(req: ExtendedRequest): string | undefined`
Extracts session ID from various sources.

**Sources:**
- `req.sessionID`
- `x-session-id` header
- `sessionId` cookie

#### `sanitizeHeaders(headers: any): Record<string, string | string[]>`
Sanitizes sensitive headers for secure logging.

**Default Sensitive Headers:**
- `authorization`
- `cookie`
- `x-api-key`
- `x-auth-token`

## 📡 Event Emission

### Automatic Events

#### REQUEST_START Event
Emitted when a request begins processing.

```typescript
interface RequestStartEvent {
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  userId?: string;
  correlationId?: string;
  sessionId?: string;
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  query: any;
  route?: string;
  controller?: string;
  handler?: string;
}
```

#### RESPONSE_SENT Event
Emitted when a response is completed.

```typescript
interface ResponseEvent {
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  userId?: string;
  correlationId?: string;
  sessionId?: string;
  statusCode: number;
  contentType?: string;
  contentLength?: number;
  duration: number;
  cacheStatus?: 'hit' | 'miss' | 'skip';
  compressionRatio?: number;
  headers: Record<string, string | string[]>;
}
```

#### ERROR_OCCURRED Event
Emitted when response errors occur.

```typescript
interface ErrorEvent {
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent?: string;
  userId?: string;
  correlationId?: string;
  sessionId?: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  phase: 'middleware' | 'guard' | 'pipe' | 'controller' | 'service' | 'filter';
  recovery?: 'handled' | 'unhandled' | 'retry';
  context?: any;
}
```

### Event Listeners

```typescript
// Custom event listener
@Injectable()
export class CustomEventListener {
  @OnEvent(LIFECYCLE_EVENTS.REQUEST_START)
  handleRequestStart(payload: { event: RequestStartEvent; metadata: any }) {
    console.log(`Request started: ${payload.event.requestId}`);
    console.log(`URL: ${payload.event.method} ${payload.event.url}`);
    console.log(`IP: ${payload.event.ip}`);
    
    // Custom processing logic
    this.trackRequest(payload.event);
  }
  
  @OnEvent(LIFECYCLE_EVENTS.RESPONSE_SENT)
  handleResponseSent(payload: { event: ResponseEvent; metadata: any }) {
    console.log(`Response sent: ${payload.event.requestId}`);
    console.log(`Status: ${payload.event.statusCode}`);
    console.log(`Duration: ${payload.event.duration}ms`);
    
    // Performance analysis
    this.analyzePerformance(payload.event);
  }
}
```

## 🔍 Context Enrichment

### Request Context

The middleware automatically enriches every request with the following context:

```typescript
// Automatic context enrichment
request['requestId']      = 'req-1700000000000-abc123';
request['correlationId']  = 'corr-1700000000000-xyz789';
request['startTime']      = 1700000000000;
request['clientIP']       = '192.168.1.100';

// Extracted if available
request.user              = { id: 'user-123', email: 'user@example.com' };
request.sessionID         = 'sess-456';
```

### Route Intelligence

The middleware includes intelligent route extraction:

```typescript
// Example for route: GET /api/users/123
{
  route: '/api/users/:id',
  controller: 'UsersController',
  handler: 'findOne'
}

// Example for route: POST /api/orders
{
  route: '/api/orders',
  controller: 'OrdersController', 
  handler: 'create'
}
```

### Header Processing

Headers are processed and sanitized:

```typescript
// Original headers
{
  'authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...',
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'x-api-key': 'secret-key-123'
}

// Sanitized headers (in events/logs)
{
  'authorization': '[REDACTED]',
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'x-api-key': '[REDACTED]'
}
```

## 🛡️ Security Features

### Header Sanitization

Sensitive headers are automatically sanitized to prevent data leaks:

```typescript
const sensitiveHeaders = [
  'authorization',
  'cookie', 
  'x-api-key',
  'x-auth-token',
  'x-csrf-token',
  'x-forwarded-authorization'
];

// Custom sanitization rules
const customSanitization = {
  'user-id': (value) => value.substring(0, 4) + '****',
  'session-token': () => '[SESSION_REDACTED]'
};
```

### IP Address Security

Multiple layers of IP detection for accurate client identification:

```typescript
// IP detection priority
const clientIP = 
  req.headers['x-forwarded-for'] ||      // Proxy/Load Balancer
  req.headers['x-real-ip'] ||            // Nginx real IP
  req.headers['x-client-ip'] ||          // Apache mod_remoteip
  req.connection.remoteAddress ||        // Direct connection
  req.socket.remoteAddress ||            // Socket connection
  'unknown';                             // Fallback
```

### Session Security

Secure session ID extraction and tracking:

```typescript
// Session ID sources (in priority order)
const sessionId = 
  req.sessionID ||                       // Express session
  req.headers['x-session-id'] ||         // Custom header
  req.cookies?.sessionId ||              // Cookie
  req.cookies?.['connect.sid'] ||        // Express default
  req.signedCookies?.sessionId;          // Signed cookie
```

## 📈 Performance Monitoring

### Response Time Tracking

Automatic measurement of request processing time:

```typescript
// Automatic timing
const startTime = Date.now();
// ... request processing ...
const duration = Date.now() - startTime;

// Performance categorization
const category = 
  duration < 100 ? 'fast' :
  duration < 500 ? 'normal' :
  duration < 1000 ? 'slow' :
  'very_slow';
```

### Memory and Resource Tracking

```typescript
// Optional resource monitoring
const resourceUsage = {
  memoryUsage: process.memoryUsage(),
  cpuUsage: process.cpuUsage(),
  timestamp: Date.now()
};

// Emit performance events for slow requests
if (duration > performanceThreshold) {
  this.eventEmitter.emitPerformanceEvent({
    requestId,
    type: 'slow_request',
    metrics: {
      duration,
      memoryUsage: resourceUsage.memoryUsage.heapUsed,
      cpuUsage: resourceUsage.cpuUsage.user
    },
    threshold: performanceThreshold,
    severity: 'warning'
  });
}
```

### Compression Analysis

Automatic detection and calculation of response compression:

```typescript
// Compression monitoring
const compressionRatio = this.getCompressionRatio(res);
const compressionSavings = originalSize - compressedSize;
const compressionPercent = (compressionSavings / originalSize) * 100;

// Performance insights
{
  compressionRatio: 0.35,      // 35% of original size
  compressionSavings: 65000,   // 65KB saved
  compressionPercent: 65,      // 65% reduction
  encoding: 'gzip'             // Compression method
}
```

## 🚨 Error Handling

### Response Error Tracking

Automatic error event emission for response errors:

```typescript
res.on('error', (error: Error) => {
  this.eventEmitter.emitErrorEvent({
    requestId,
    ip: this.getClientIP(req),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    phase: 'middleware',
    recovery: 'unhandled',
    context: {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      headers: req.headers
    }
  });
});
```

### Graceful Degradation

The middleware handles various error scenarios gracefully:

```typescript
// Safe header extraction
const userAgent = req.get('User-Agent') || 'unknown';

// Safe user ID extraction with fallbacks
const userId = req.user?.id || 
               req.user?.userId || 
               req.user?.sub || 
               req.headers['x-user-id'] || 
               undefined;

// Safe session extraction
const sessionId = req.sessionID || 
                  req.headers['x-session-id'] || 
                  req.cookies?.sessionId || 
                  undefined;
```

### Error Recovery

Built-in error recovery mechanisms:

```typescript
try {
  // Process request context
  this.enrichRequestContext(req);
} catch (error) {
  // Log error but continue processing
  this.logger.warn('Failed to enrich request context', {
    error: error.message,
    requestId: req['requestId']
  });
}

try {
  // Emit request start event
  this.eventEmitter.emitRequestStart(eventData);
} catch (error) {
  // Log error but don't break request flow
  this.logger.error('Failed to emit request start event', {
    error: error.message,
    requestId
  });
}
```

## 💡 Best Practices

### 1. Middleware Ordering

Place the lifecycle middleware early in the chain but after security middleware:

```typescript
consumer
  .apply(
    SecurityHeadersMiddleware,     // 1. Security first
    CorsMiddleware,               // 2. CORS handling
    LifecycleRequestMiddleware,   // 3. Lifecycle tracking
    RateLimitMiddleware,          // 4. Rate limiting
    LoggingMiddleware,            // 5. Request logging
    CompressionMiddleware         // 6. Response compression
  )
  .forRoutes('*');
```

### 2. Event Listener Optimization

Optimize event listeners for high-throughput scenarios:

```typescript
@OnEvent(LIFECYCLE_EVENTS.REQUEST_START, { async: true })
async handleRequestStart(payload) {
  // Use async processing for non-critical tasks
  setImmediate(() => {
    this.processRequestMetrics(payload);
  });
}

@OnEvent(LIFECYCLE_EVENTS.RESPONSE_SENT, { async: true })
async handleResponseSent(payload) {
  // Batch processing for performance
  this.batchProcessor.add(payload);
}
```

### 3. Context Usage

Use request context efficiently:

```typescript
// Good: Access context once and store
const context = {
  requestId: req['requestId'],
  correlationId: req['correlationId'],
  userId: req.user?.id
};

// Bad: Multiple property accesses
someMethod(req['requestId']);
anotherMethod(req['correlationId']); 
yetAnother(req['requestId']); // Duplicate access
```

### 4. Memory Management

Manage event history to prevent memory leaks:

```typescript
// Configure event retention
EventsModule.forRoot({
  maxEventHistory: 1000,        // Keep last 1000 events
  eventHistoryTtl: 300000,      // 5 minutes TTL
  enableAutoCleanup: true       // Automatic cleanup
});
```

### 5. Performance Considerations

Monitor and optimize middleware performance:

```typescript
// Use performance marks for profiling
performance.mark('middleware-start');
// ... middleware processing ...
performance.mark('middleware-end');
performance.measure('middleware-duration', 'middleware-start', 'middleware-end');
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Missing Request ID

**Problem**: Request ID is not generated
```typescript
// Check if middleware is properly registered
console.log(req['requestId']); // undefined
```

**Solution**: Ensure middleware is registered before other middleware that depend on it
```typescript
consumer
  .apply(LifecycleRequestMiddleware) // Must be early in chain
  .forRoutes('*');
```

#### 2. Events Not Emitting

**Problem**: Lifecycle events are not being emitted
```typescript
// No events received in listeners
@OnEvent(LIFECYCLE_EVENTS.REQUEST_START)
handleRequestStart(payload) {
  // This never gets called
}
```

**Solutions**:
```typescript
// 1. Check EventsModule is imported
@Module({
  imports: [EventsModule.forRoot()], // Must be imported
})

// 2. Check service is properly injected
constructor(
  private readonly eventEmitter: LifecycleEventEmitter // Must be injected
) {}

// 3. Check event listener is registered
@Injectable()
export class MyListener {} // Must be @Injectable

// 4. Add to providers
@Module({
  providers: [MyListener], // Must be provided
})
```

#### 3. Context Information Missing

**Problem**: User context or session information is missing
```typescript
console.log(req.user); // undefined
console.log(req['sessionId']); // undefined
```

**Solutions**:
```typescript
// 1. Ensure authentication middleware runs first
consumer
  .apply(
    AuthenticationMiddleware,    // Must come first
    LifecycleRequestMiddleware   // Then lifecycle
  );

// 2. Check session middleware configuration
app.use(session({
  // Session configuration
}));

// 3. Verify JWT strategy setup
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  validate(payload: any) {
    return { id: payload.sub, email: payload.email }; // Must return user
  }
}
```

#### 4. Performance Issues

**Problem**: Middleware causing performance degradation
```typescript
// High response times
Duration: 5000ms (expected: <100ms)
```

**Solutions**:
```typescript
// 1. Enable async event processing
@OnEvent(LIFECYCLE_EVENTS.REQUEST_START, { async: true })
async handleRequest(payload) {
  // Non-blocking processing
}

// 2. Optimize header sanitization
const optimizedSanitization = {
  sensitiveHeaders: new Set(['authorization', 'cookie']), // Use Set for O(1) lookup
};

// 3. Implement event batching
class BatchEventProcessor {
  private batch: any[] = [];
  
  add(event: any) {
    this.batch.push(event);
    if (this.batch.length >= 100) {
      this.processBatch();
    }
  }
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Environment variable
DEBUG=lifecycle:middleware

// Or programmatically
EventsModule.forRoot({
  debug: true,
  logLevel: 'debug'
});
```

### Health Checks

Implement middleware health monitoring:

```typescript
@Injectable()
export class MiddlewareHealthCheck {
  @Get('health/middleware')
  checkMiddleware() {
    const stats = this.eventEmitter.getEventStatistics();
    
    return {
      status: 'healthy',
      middleware: {
        requestsProcessed: stats.totalEvents,
        averageResponseTime: this.calculateAverageResponseTime(),
        errorRate: this.calculateErrorRate()
      }
    };
  }
}
```

### Monitoring and Alerts

Set up monitoring for middleware performance:

```typescript
// Performance monitoring
@OnEvent(LIFECYCLE_EVENTS.RESPONSE_SENT)
monitorPerformance(payload) {
  const { duration } = payload.event;
  
  if (duration > 5000) {
    this.alertingService.sendAlert({
      type: 'SLOW_REQUEST',
      duration,
      threshold: 5000,
      requestId: payload.event.requestId
    });
  }
}

// Error rate monitoring
@OnEvent(LIFECYCLE_EVENTS.ERROR_OCCURRED)
monitorErrors(payload) {
  this.errorCounter.increment();
  
  const errorRate = this.calculateErrorRate();
  if (errorRate > 0.05) { // 5% error rate
    this.alertingService.sendAlert({
      type: 'HIGH_ERROR_RATE',
      rate: errorRate,
      threshold: 0.05
    });
  }
}
```

---

## 📄 Related Documentation

- [Request Lifecycle Events Overview](../README.md)
- [Event Listeners Documentation](../listeners/README.md)
- [Authorization Guard Documentation](../guards/README.md)
- [Event Emitter Service Documentation](../lifecycle-event-emitter.service.md)

## 🤝 Contributing

When contributing to the middleware:

1. **Follow TypeScript best practices**
2. **Add comprehensive tests**
3. **Update documentation**
4. **Consider performance implications**
5. **Maintain backward compatibility**

## 📝 License

This middleware is part of the Request Lifecycle Events system and follows the same license terms as the main project.