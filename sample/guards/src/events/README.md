# NestJS Request Lifecycle Events

## Overview

This project implements a comprehensive **Request Lifecycle Events** system that provides deep visibility into the NestJS request processing pipeline. Using an event-driven architecture powered by EventEmitter2, this system captures, processes, and analyzes every aspect of request handling from initial receipt to final response.

## What are Request Lifecycle Events?

Request Lifecycle Events are a comprehensive monitoring and observability system that tracks every phase of request processing in a NestJS application. Unlike traditional logging, this event-driven approach provides:

- **Real-time monitoring** of request flow
- **Structured event data** with correlation IDs
- **Automated threat detection** and security analysis
- **Performance metrics** collection and analysis
- **Comprehensive auditing** capabilities
- **Event-driven integrations** with external systems

### Request Processing Pipeline

The complete request lifecycle with event emission points:

```
Incoming Request
       ↓
🎯 REQUEST_START ← LifecycleRequestMiddleware
       ↓
   Middleware Chain (Security Headers, Rate Limiting, etc.)
       ↓
🔐 AUTH_ATTEMPT/SUCCESS/FAILURE ← Authentication Guards
       ↓
🛡️ AUTHZ_CHECK/GRANTED/DENIED ← LifecycleAuthzGuard
       ↓
   Interceptors (Before)
       ↓
✔️ VALIDATION_START/SUCCESS/FAILURE ← Validation Pipes
       ↓
⚙️ PROCESSING_START ← Controller Method Entry
       ↓
   Business Logic Execution
       ↓
⚙️ PROCESSING_COMPLETE ← Controller Method Exit
       ↓
   Interceptors (After) 
       ↓
🔄 RESPONSE_SENT ← LifecycleRequestMiddleware
       ↓
   Response to Client

Errors at any stage:
💥 ERROR_OCCURRED ← Exception Filters

Security Events:
🚨 SECURITY_ATTACK_DETECTED ← Security Interceptors
⚠️ SECURITY_SUSPICIOUS_ACTIVITY ← Pattern Detection
🚦 RATE_LIMIT_THROTTLED ← Rate Limiting

Performance Events:
🐌 PERFORMANCE_SLOW_REQUEST ← Performance Monitoring
🧠 PERFORMANCE_HIGH_MEMORY ← Resource Monitoring

Cache Events:
💾 CACHE_HIT/MISS/SET ← Caching Operations
```

## Architecture Components

### 1. 📋 Event Interfaces (`lifecycle-events.interface.ts`)

**Purpose**: Defines strongly-typed event structures for all lifecycle phases

**Key Event Types**:
- `RequestStartEvent` - Initial request reception
- `AuthenticationEvent` - Authentication attempts and outcomes  
- `AuthorizationEvent` - Authorization checks and decisions
- `ValidationEvent` - Input validation results
- `ProcessingEvent` - Business logic execution tracking
- `ResponseEvent` - Response generation and delivery
- `ErrorEvent` - Error occurrences and handling
- `SecurityEvent` - Security threats and incidents
- `PerformanceEvent` - Performance metrics and alerts
- `CacheEvent` - Caching operations and statistics

**Event Structure Example**:
```typescript
interface RequestStartEvent extends BaseLifecycleEvent {
  requestId: string;
  timestamp: Date;
  ip: string;
  userAgent: string;
  userId?: string;
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  query: Record<string, any>;
  controller?: string;
  handler?: string;
}
```

### 2. 🚀 Event Emitter Service (`lifecycle-event-emitter.service.ts`)

**Purpose**: Central event emission service with metadata enrichment and history tracking

**Key Features**:
- **Metadata Enrichment**: Automatic addition of timestamps, trace IDs, environment info
- **Event History**: Configurable event storage with size limits
- **Statistics Tracking**: Event counts and performance metrics
- **Helper Methods**: Convenient methods for each event type

**Usage Examples**:
```typescript
// Emit authentication event
eventEmitter.emitAuthEvent({
  requestId: 'req-123',
  ip: '192.168.1.1',
  action: 'success',
  method: 'bearer',
  duration: 45,
});

// Emit security event
eventEmitter.emitSecurityEvent({
  requestId: 'req-123',
  ip: '192.168.1.1',
  type: 'attack_detected',
  severity: 'high',
  details: {
    attackType: 'sql_injection',
    pattern: /union.*select/i,
    blocked: true,
  },
});
```

**Statistics API**:
```typescript
const stats = eventEmitter.getEventStatistics();
console.log(stats);
// Output:
{
  totalEvents: 15420,
  eventCounts: {
    'request.start': 2156,
    'auth.success': 1987,
    'auth.failure': 169,
    'response.sent': 2150
  },
  recentEventCount: 324,
  averageEventsPerMinute: 45.2
}
```

### 3. 📝 Event Listeners

#### Logging Event Listener (`logging-event.listener.ts`)

**Purpose**: Comprehensive structured logging with sensitive data filtering

**Features**:
- **Structured Logging**: JSON-formatted logs with consistent fields
- **Correlation IDs**: Request tracking across distributed systems
- **Sensitive Data Filtering**: Automatic redaction of passwords, tokens, etc.
- **Emoji Indicators**: Visual log categorization
- **Performance Context**: Response times and resource usage

**Log Format Examples**:
```
🚀 REQUEST START [req-abc123] GET /api/users - IP: 192.168.1.1 - UserAgent: Mozilla/5.0...
🔐 AUTH SUCCESS [req-abc123] User: user-456 Duration: 23ms
🛡️ AUTHZ GRANTED [req-abc123] Resource: get:/api/users AccessLevel: STANDARD
✔️ VALIDATION SUCCESS [req-abc123] Target: query Validator: ParseIntPipe
⚙️ PROCESSING START [req-abc123] UsersController.findAll
✨ PROCESSING COMPLETE [req-abc123] UsersController.findAll Duration: 156ms
✅ RESPONSE [req-abc123] Status: 200 Duration: 234ms Size: 1.2KB
```

#### Metrics Event Listener (`metrics-event.listener.ts`)

**Purpose**: Comprehensive metrics collection and analytics

**Key Metrics Collected**:
- **Request Metrics**: Count, duration, status codes, endpoints
- **Authentication Metrics**: Attempts, failures, success rates
- **Performance Metrics**: Response times, percentiles, slow requests
- **Cache Metrics**: Hit rates, miss counts, performance impact
- **Error Metrics**: Error rates, types, frequency
- **User Activity**: Active users, request patterns, geographic distribution

**Analytics API**:
```typescript
const summary = metricsListener.getMetricsSummary();
console.log(summary);
// Output:
{
  overview: {
    totalRequests: 12543,
    averageResponseTime: 245, // ms
    errorRate: 2.1, // %
    authFailureRate: 7.8, // %
    cacheHitRate: 67.3, // %
    slowRequestCount: 89,
    rateLimitHits: 12
  },
  topEndpoints: [
    { key: "GET /api/users", count: 3421 },
    { key: "POST /api/auth/login", count: 1987 }
  ],
  statusCodes: {
    "200": 10234,
    "400": 123,
    "401": 89,
    "500": 12
  }
}
```

**Time Series Data**:
```typescript
const timeSeries = metricsListener.getTimeSeriesData();
// Returns minute-by-minute data for visualization
{
  requests: [
    { timestamp: "2023-11-18T10:00:00Z", value: 45, count: 45 },
    { timestamp: "2023-11-18T10:01:00Z", value: 52, count: 52 }
  ],
  responseTimes: [
    { timestamp: "2023-11-18T10:00:00Z", value: 234, count: 45 }
  ]
}
```

#### Security Event Listener (`security-event.listener.ts`)

**Purpose**: Advanced security monitoring and threat detection

**Security Features**:
- **Threat Intelligence**: IP risk scoring and behavior tracking
- **Attack Pattern Detection**: SQL injection, XSS, path traversal, command injection
- **Behavioral Analysis**: Brute force detection, privilege escalation attempts
- **Risk Scoring**: Dynamic risk assessment based on activities
- **Incident Management**: Security incident creation and tracking
- **Automated Blocking**: IP blocking based on risk thresholds

**Threat Intelligence Example**:
```typescript
const threatIntel = securityListener.getThreatIntelligence('192.168.1.100');
// Output:
{
  ip: '192.168.1.100',
  riskScore: 85, // 0-100
  firstSeen: '2023-11-18T09:30:00Z',
  lastSeen: '2023-11-18T10:45:00Z',
  incidents: 7,
  behaviors: ['auth_failure', 'injection_attempt', 'privilege_escalation'],
  blocked: true,
  reason: 'Multiple security violations'
}
```

**Security Dashboard**:
```typescript
const security = securityListener.getSecuritySummary();
// Output:
{
  overview: {
    totalIncidents: 156,
    recentIncidents: 12, // last hour
    unresolvedIncidents: 3,
    highRiskIPs: 8,
    criticalRiskIPs: 2,
    blockedIPs: 15
  },
  incidentsByType: {
    'auth_failure': 89,
    'attack_detected': 23,
    'suspicious_pattern': 44
  },
  topThreatIPs: [
    { ip: '192.168.1.100', riskScore: 95, incidents: 7 }
  ]
}
```

### 4. 🔧 Enhanced Architecture Integration

#### Lifecycle Request Middleware (`lifecycle-request.middleware.ts`)

**Purpose**: Enhanced middleware that enriches request context and emits lifecycle events

**Features**:
- **Request ID Generation**: Unique identifier for request tracking
- **Correlation ID Management**: Distributed tracing support
- **Context Enrichment**: User, session, IP, and routing information
- **Automatic Event Emission**: Request start and response events
- **Header Sanitization**: Secure logging of request/response headers

**Integration Example**:
```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        SecurityHeadersMiddleware,
        LifecycleRequestMiddleware,  // Add lifecycle middleware
        RateLimitMiddleware,
        LoggingMiddleware
      )
      .forRoutes('*');
  }
}
```

#### Lifecycle Authorization Guard (`lifecycle-authz.guard.ts`)

**Purpose**: Enhanced authorization guard with detailed event emission

**Features**:
- **Detailed Authorization Events**: Check, granted, denied with context
- **Access Level Validation**: Hierarchical access level checking
- **Permission Validation**: Fine-grained permission checking
- **Security Event Integration**: Automatic threat detection for suspicious access patterns
- **Performance Tracking**: Authorization duration monitoring

**Usage Example**:
```typescript
@Controller('admin')
@UseGuards(LifecycleAuthzGuard) // Use enhanced guard
export class AdminController {
  @Get('users')
  @SecureEndpoint(AccessLevel.ADMIN)
  @Permissions(['user:read', 'admin:access'])
  getUsers() {
    return this.adminService.getUsers();
  }
}
```

## Implementation Guide

### Step 1: Module Integration

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { EventsModule } from './events/events.module';
import { LifecycleRequestMiddleware } from './events';

@Module({
  imports: [
    // Add EventsModule
    EventsModule.forRoot({
      enableLogging: true,
      enableMetrics: true,
      enableSecurity: true,
      logLevel: 'debug',
      metricsRetention: 24, // hours
      securityThresholds: {
        authFailuresPerHour: 10,
        highRiskScore: 70,
      },
    }),
    // ... other modules
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LifecycleRequestMiddleware)
      .forRoutes('*');
  }
}
```

### Step 2: Enhanced Guards Integration

```typescript
// Replace existing guards with lifecycle-aware versions
import { LifecycleAuthzGuard } from './events';

@Controller('api')
@UseGuards(LifecycleAuthzGuard)
export class ApiController {
  // Your controller methods
}
```

### Step 3: Custom Event Emission

```typescript
// In your services
import { LifecycleEventEmitter } from './events';

@Injectable()
export class UserService {
  constructor(
    private readonly eventEmitter: LifecycleEventEmitter
  ) {}

  async createUser(userData: CreateUserDto, requestId: string) {
    // Emit processing start event
    this.eventEmitter.emitProcessingEvent({
      requestId,
      action: 'start',
      controller: 'UserService',
      handler: 'createUser',
    });

    try {
      const user = await this.userRepository.save(userData);
      
      // Emit success event
      this.eventEmitter.emitProcessingEvent({
        requestId,
        action: 'complete',
        controller: 'UserService',
        handler: 'createUser',
        duration: Date.now() - startTime,
      });

      return user;
    } catch (error) {
      // Emit error event
      this.eventEmitter.emitErrorEvent({
        requestId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        phase: 'controller',
        context: { userData },
      });
      throw error;
    }
  }
}
```

### Step 4: Custom Event Listeners

```typescript
// Create custom event listeners for specific business logic
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LIFECYCLE_EVENTS, LifecycleEventWithMetadata, AuthenticationEvent } from './events';

@Injectable()
export class CustomBusinessListener {
  @OnEvent(LIFECYCLE_EVENTS.AUTH_SUCCESS)
  handleUserLogin(payload: LifecycleEventWithMetadata<AuthenticationEvent>) {
    const { event } = payload;
    
    // Custom business logic
    if (event.userId) {
      // Update user last login time
      // Send welcome notification
      // Update user activity analytics
    }
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTH_FAILURE)
  handleFailedLogin(payload: LifecycleEventWithMetadata<AuthenticationEvent>) {
    const { event } = payload;
    
    // Custom security logic
    // Update fraud detection systems
    // Send security alerts
    // Update user account security status
  }
}
```

## Monitoring and Observability

### Dashboard Endpoints

Create monitoring endpoints to expose metrics:

```typescript
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly eventEmitter: LifecycleEventEmitter,
    private readonly metricsListener: MetricsEventListener,
    private readonly securityListener: SecurityEventListener
  ) {}

  @Get('events/stats')
  getEventStatistics() {
    return this.eventEmitter.getEventStatistics();
  }

  @Get('metrics/summary')
  getMetricsSummary() {
    return this.metricsListener.getMetricsSummary();
  }

  @Get('metrics/timeseries')
  getTimeSeriesData() {
    return this.metricsListener.getTimeSeriesData();
  }

  @Get('security/summary')
  getSecuritySummary() {
    return this.securityListener.getSecuritySummary();
  }

  @Get('security/threats/:ip')
  getThreatIntelligence(@Param('ip') ip: string) {
    return this.securityListener.getThreatIntelligence(ip);
  }
}
```

### Health Check Integration

```typescript
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class EventsHealthIndicator extends HealthIndicator {
  constructor(
    private readonly metricsListener: MetricsEventListener,
    private readonly securityListener: SecurityEventListener
  ) {
    super();
  }

  check(key: string): HealthIndicatorResult {
    const metrics = this.metricsListener.getMetricsSummary();
    const security = this.securityListener.getSecuritySummary();
    
    const isHealthy = 
      metrics.overview.errorRate < 5 && // Less than 5% error rate
      security.overview.criticalRiskIPs === 0; // No critical threats
    
    return this.getStatus(key, isHealthy, {
      errorRate: metrics.overview.errorRate,
      averageResponseTime: metrics.overview.averageResponseTime,
      criticalThreats: security.overview.criticalRiskIPs,
      recentIncidents: security.overview.recentIncidents,
    });
  }
}
```

### Alerting Integration

```typescript
@Injectable()
export class AlertingService {
  @OnEvent(LIFECYCLE_EVENTS.SECURITY_ATTACK_DETECTED)
  async handleSecurityAlert(payload: LifecycleEventWithMetadata<SecurityEvent>) {
    const { event } = payload;
    
    if (event.severity === 'critical') {
      // Send immediate alert
      await this.sendSlackAlert(`🚨 Critical security attack detected from ${event.ip}`);
      await this.sendEmailAlert(event);
      await this.updateSecurityDashboard(event);
    }
  }

  @OnEvent(LIFECYCLE_EVENTS.PERFORMANCE_SLOW_REQUEST)
  async handlePerformanceAlert(payload: LifecycleEventWithMetadata<PerformanceEvent>) {
    const { event } = payload;
    
    if (event.metrics.duration > 5000) { // > 5 seconds
      await this.sendPerformanceAlert(`⚠️ Very slow request: ${event.metrics.duration}ms`);
    }
  }
}
```

## Advanced Usage Patterns

### Event Correlation and Tracing

```typescript
// Using correlation IDs for distributed tracing
@Injectable()
export class OrderService {
  async processOrder(orderData: any, requestId: string) {
    const correlationId = `order-${Date.now()}`;
    
    // Emit order processing start
    this.eventEmitter.emitProcessingEvent({
      requestId,
      correlationId,
      action: 'start',
      controller: 'OrderService',
      handler: 'processOrder',
    });

    // Call external services with correlation ID
    await this.paymentService.processPayment(orderData.payment, correlationId);
    await this.inventoryService.reserveItems(orderData.items, correlationId);
    await this.shippingService.scheduleShipping(orderData.shipping, correlationId);
  }
}
```

### Event Filtering and Routing

```typescript
// Route specific events to different handlers
@Injectable()
export class SpecializedEventHandler {
  @OnEvent('request.start', { async: true })
  async handleRequestStart(payload: any) {
    // Handle all request start events asynchronously
  }

  @OnEvent('auth.*') // Wildcard matching
  async handleAuthEvents(payload: any) {
    // Handle all authentication-related events
  }

  @OnEvent('security.attack_detected', { 
    filter: (payload: any) => payload.event.severity === 'critical' 
  })
  async handleCriticalSecurityEvents(payload: any) {
    // Handle only critical security events
  }
}
```

### Event Aggregation and Batching

```typescript
@Injectable()
export class EventAggregator {
  private eventBuffer: LifecycleEvent[] = [];
  
  @OnEvent('**') // Listen to all events
  bufferEvent(payload: LifecycleEventWithMetadata) {
    this.eventBuffer.push(payload.event);
    
    // Process in batches of 100 or every 30 seconds
    if (this.eventBuffer.length >= 100) {
      this.processBatch();
    }
  }

  @Cron('*/30 * * * * *') // Every 30 seconds
  processBatch() {
    if (this.eventBuffer.length > 0) {
      const batch = this.eventBuffer.splice(0);
      this.sendToAnalyticsService(batch);
    }
  }
}
```

## Performance Considerations

### Event Processing Performance

- **Async Processing**: Use `{ async: true }` for non-critical event handlers
- **Event Filtering**: Use filter functions to reduce unnecessary processing
- **Batch Processing**: Aggregate events for bulk operations
- **Memory Management**: Configure appropriate history sizes and cleanup intervals

### Memory Management

```typescript
// Regular cleanup of old events and metrics
@Injectable()
export class MaintenanceService {
  @Cron('0 0 * * *') // Daily at midnight
  async performMaintenance() {
    // Clear old events
    this.eventEmitter.clearEventHistory();
    
    // Clear old metrics
    this.metricsListener.clearMetrics();
    
    // Cleanup old security data
    this.securityListener.cleanup();
  }
}
```

### Configuration Optimization

```typescript
// Optimize for your use case
EventsModule.forRoot({
  // Disable features you don't need
  enableLogging: process.env.NODE_ENV === 'development',
  enableMetrics: true,
  enableSecurity: true,
  
  // Adjust retention and limits
  metricsRetention: 24, // hours
  timeSeriesLength: 1440, // minutes (24 hours)
  
  // EventEmitter2 optimization
  maxListeners: 50,
  wildcard: false, // Disable if not using wildcards
})
```

## Testing

### Unit Testing Event Listeners

```typescript
describe('SecurityEventListener', () => {
  let listener: SecurityEventListener;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SecurityEventListener],
    }).compile();

    listener = module.get<SecurityEventListener>(SecurityEventListener);
  });

  it('should detect brute force attacks', () => {
    const mockEvent = createMockAuthFailureEvent({
      ip: '192.168.1.100',
      requestId: 'test-123',
    });

    // Simulate multiple failed attempts
    for (let i = 0; i < 10; i++) {
      listener.handleAuthFailure({ event: mockEvent, metadata: mockMetadata });
    }

    const threats = listener.getThreatIntelligence('192.168.1.100');
    expect(threats.riskScore).toBeGreaterThan(50);
  });
});
```

### Integration Testing

```typescript
describe('Events Integration', () => {
  let app: INestApplication;
  let eventEmitter: LifecycleEventEmitter;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [EventsModule, TestModule],
    }).compile();

    app = module.createNestApplication();
    eventEmitter = module.get<LifecycleEventEmitter>(LifecycleEventEmitter);
    await app.init();
  });

  it('should emit events throughout request lifecycle', async () => {
    const eventSpy = jest.spyOn(eventEmitter, 'emit');

    await request(app.getHttpServer())
      .get('/test')
      .expect(200);

    expect(eventSpy).toHaveBeenCalledWith('request.start', expect.any(Object));
    expect(eventSpy).toHaveBeenCalledWith('response.sent', expect.any(Object));
  });
});
```

## Troubleshooting

### Common Issues

1. **Memory Leaks**: Configure appropriate limits and cleanup intervals
2. **Performance Impact**: Use async event handlers for non-critical processing
3. **Event Loss**: Ensure proper error handling in event listeners
4. **Configuration**: Validate EventEmitter2 configuration for your use case

### Debug Mode

```typescript
// Enable debug logging
EventsModule.forRoot({
  logLevel: 'debug',
  verboseMemoryLeak: true,
})
```

### Monitoring Event Health

```typescript
@Injectable()
export class EventHealthMonitor {
  @Cron('*/5 * * * * *') // Every 5 seconds
  checkEventHealth() {
    const stats = this.eventEmitter.getEventStatistics();
    
    if (stats.averageEventsPerMinute === 0) {
      this.logger.warn('No events being emitted - check event emitters');
    }
    
    if (stats.totalEvents > 100000) {
      this.logger.warn('High event volume - consider cleanup');
    }
  }
}
```

## Conclusion

The Request Lifecycle Events system provides comprehensive observability and monitoring capabilities for NestJS applications. By implementing event-driven architecture at every stage of request processing, you gain:

- **Complete Visibility**: Track every request from start to finish
- **Security Monitoring**: Real-time threat detection and response
- **Performance Insights**: Detailed metrics and performance analysis
- **Operational Intelligence**: Rich data for optimization and troubleshooting
- **Audit Trail**: Complete request history for compliance and debugging

This system integrates seamlessly with existing NestJS architecture while providing enterprise-level monitoring and security capabilities.

## Related Documentation

- [NestJS Guards](../security/README.md) - Authentication and Authorization
- [NestJS Middleware](../middleware/README.md) - Request preprocessing
- [NestJS Interceptors](../interceptors/README.md) - Request/response transformation
- [NestJS Exception Filters](../filters/README.md) - Error handling
- [NestJS Pipes](../pipes/README.md) - Input validation and transformation