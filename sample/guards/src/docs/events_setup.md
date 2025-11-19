# 🚀 How to Run Events Code - Complete Guide

## 📋 Prerequisites

✅ **Dependencies Installed** - The project already has:
- `@nestjs/event-emitter` - Event system integration
- `eventemitter2` - Core event emitter library

## 🔧 Step 1: Enable Events Module in AppModule ✅ DONE

The EventsModule has been added to your AppModule with configuration:

```typescript
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
  ],
})
```

## 🚀 Step 2: Run the Application

### Development Mode (Recommended)
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

### Debug Mode
```bash
npm run start:debug
```

## 📊 Step 3: Test Events System

### 3.1 Test Authentication Events

#### Login Request (Success):
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin"
  }'
```

**Events Generated:**
- `REQUEST_START` - Request initiated
- `AUTH_ATTEMPT` - Authentication attempt logged
- `AUTH_SUCCESS` - Successful authentication
- `PROCESSING_START` - Controller processing begins
- `PROCESSING_COMPLETE` - Controller processing complete
- `RESPONSE_SENT` - Response sent to client

#### Login Request (Failure):
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "invalid",
    "password": "wrong"
  }'
```

**Events Generated:**
- `REQUEST_START` - Request initiated
- `AUTH_ATTEMPT` - Authentication attempt logged
- `AUTH_FAILURE` - Failed authentication
- `ERROR_OCCURRED` - Error in processing
- `RESPONSE_SENT` - Error response sent

### 3.2 Test Authorization Events

#### Protected Endpoint (Success):
```bash
# First get a token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | \
  jq -r '.token')

# Then access protected endpoint
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Events Generated:**
- `REQUEST_START` - Request initiated
- `AUTH_ATTEMPT` - Token validation
- `AUTH_SUCCESS` - Token validated
- `AUTHZ_CHECK` - Authorization check
- `AUTHZ_GRANTED` - Access granted
- `PROCESSING_START` - Controller processing
- `PROCESSING_COMPLETE` - Processing complete
- `RESPONSE_SENT` - Response sent

#### Protected Endpoint (Access Denied):
```bash
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

**Events Generated:**
- `REQUEST_START` - Request initiated
- `AUTH_SUCCESS` - Token validated
- `AUTHZ_CHECK` - Authorization check
- `AUTHZ_DENIED` - Access denied (insufficient level)
- `ERROR_OCCURRED` - Forbidden error
- `RESPONSE_SENT` - Error response

### 3.3 Test Rate Limiting Events

#### Trigger Rate Limit:
```bash
# Send multiple requests quickly
for i in {1..10}; do
  curl -X GET http://localhost:3000/api/public-info
done
```

**Events Generated:**
- `RATE_LIMIT_ALLOWED` - For requests within limit
- `RATE_LIMIT_THROTTLED` - When limit is approached
- `RATE_LIMIT_BLOCKED` - When limit is exceeded
- `SECURITY_SUSPICIOUS_ACTIVITY` - Potential abuse detected

### 3.4 Test Performance Events

#### Slow Request Simulation:
```bash
curl -X GET http://localhost:3000/api/slow-endpoint
```

**Events Generated:**
- `PERFORMANCE_SLOW_REQUEST` - Request took longer than threshold
- `PERFORMANCE_HIGH_MEMORY` - High memory usage detected
- `PERFORMANCE_HIGH_CPU` - High CPU usage detected

## 📋 Step 4: Monitor Events in Logs

When you run the application, you'll see structured event logs like:

```
[Nest] 12345  - 11/19/2025, 2:30:45 PM     LOG [LoggingEventListener] 🚀 REQUEST START [req-1700000000000-abc123] GET /auth/login
[Nest] 12345  - 11/19/2025, 2:30:45 PM     LOG [LoggingEventListener] 🔐 AUTH ATTEMPT [req-1700000000000-abc123] Method: bearer
[Nest] 12345  - 11/19/2025, 2:30:45 PM     LOG [LoggingEventListener] ✅ AUTH SUCCESS [req-1700000000000-abc123] User: admin Duration: 45ms
[Nest] 12345  - 11/19/2025, 2:30:45 PM     LOG [LoggingEventListener] ✨ PROCESSING COMPLETE [req-1700000000000-abc123] AuthController.login Duration: 123ms
[Nest] 12345  - 11/19/2025, 2:30:45 PM     LOG [LoggingEventListener] ✅ RESPONSE [req-1700000000000-abc123] Status: 200 Duration: 168ms Size: 256bytes
```

## 🔍 Step 5: Available Event Types

### Authentication Events
- `AUTH_ATTEMPT` - Authentication attempt started
- `AUTH_SUCCESS` - Authentication successful
- `AUTH_FAILURE` - Authentication failed

### Authorization Events
- `AUTHZ_CHECK` - Authorization check initiated
- `AUTHZ_GRANTED` - Access granted
- `AUTHZ_DENIED` - Access denied

### Request Lifecycle Events
- `REQUEST_START` - Request received
- `PROCESSING_START` - Controller processing started
- `PROCESSING_COMPLETE` - Controller processing finished
- `PROCESSING_ERROR` - Error during processing
- `RESPONSE_SENT` - Response sent to client

### Security Events
- `SECURITY_ATTACK_DETECTED` - Potential attack detected
- `SECURITY_SUSPICIOUS_ACTIVITY` - Suspicious behavior patterns
- `SECURITY_RATE_LIMITED` - Rate limit exceeded
- `SECURITY_IP_BLOCKED` - IP address blocked

### Performance Events
- `PERFORMANCE_SLOW_REQUEST` - Request exceeded time threshold
- `PERFORMANCE_HIGH_MEMORY` - High memory usage detected
- `PERFORMANCE_HIGH_CPU` - High CPU usage detected

### Cache Events
- `CACHE_HIT` - Cache hit occurred
- `CACHE_MISS` - Cache miss occurred
- `CACHE_SET` - Data cached
- `CACHE_DELETE` - Cache entry deleted

### Rate Limiting Events
- `RATE_LIMIT_ALLOWED` - Request allowed
- `RATE_LIMIT_THROTTLED` - Request throttled
- `RATE_LIMIT_BLOCKED` - Request blocked

## 🛠️ Step 6: Custom Event Listeners

Create your own event listeners for specific business logic:

```typescript
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LIFECYCLE_EVENTS } from '../lifecycle-events.interface';

@Injectable()
export class CustomBusinessListener {
  
  @OnEvent(LIFECYCLE_EVENTS.AUTH_SUCCESS)
  handleUserLogin(payload: any): void {
    console.log(`User ${payload.event.userId} logged in successfully`);
    // Custom business logic here:
    // - Update last login timestamp
    // - Send welcome notification
    // - Log user activity
  }

  @OnEvent(LIFECYCLE_EVENTS.SECURITY_ATTACK_DETECTED)
  handleSecurityThreat(payload: any): void {
    console.log(`Security threat detected from ${payload.event.ip}`);
    // Custom security logic here:
    // - Alert security team
    // - Block IP address
    // - Increase monitoring
  }
}
```

## 📊 Step 7: Event Metrics Dashboard

Access metrics through the events listeners:

```typescript
// In your service or controller
constructor(
  private readonly metricsListener: MetricsEventListener,
  private readonly securityListener: SecurityEventListener,
) {}

async getEventMetrics() {
  return {
    metrics: this.metricsListener.getMetrics(),
    security: this.securityListener.getSecuritySummary(),
    performance: this.metricsListener.getPerformanceStats(),
  };
}
```

## 🧪 Step 8: Testing Events

### Unit Tests
```typescript
describe('Events System', () => {
  let eventEmitter: LifecycleEventEmitter;
  let listener: LoggingEventListener;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [EventsModule],
    }).compile();

    eventEmitter = module.get<LifecycleEventEmitter>(LifecycleEventEmitter);
    listener = module.get<LoggingEventListener>(LoggingEventListener);
  });

  it('should emit authentication events', async () => {
    const spy = jest.spyOn(listener, 'handleAuthSuccess');
    
    await eventEmitter.emitAuthenticationEvent('success', {
      requestId: 'test-123',
      userId: 'user-456',
      method: 'bearer',
    });

    expect(spy).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
describe('Events Integration', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should emit events during request lifecycle', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'admin' })
      .expect(200)
      .expect(() => {
        // Verify events were emitted
        // (you'd need to capture events in test)
      });
  });
});
```

## 🔧 Step 9: Configuration Options

### Basic Configuration
```typescript
EventsModule.forRoot({
  enableLogging: true,     // Enable event logging
  enableMetrics: true,     // Enable metrics collection
  enableSecurity: true,    // Enable security monitoring
  logLevel: 'log',        // Log level
  metricsRetention: 24,   // Hours to retain metrics
})
```

### Advanced Configuration
```typescript
EventsModule.forRoot({
  // Event emitter configuration
  wildcard: true,
  delimiter: '.',
  maxListeners: 50,
  
  // Security thresholds
  securityThresholds: {
    authFailuresPerHour: 100,
    authzDenialsPerHour: 50,
    validationFailuresPerHour: 200,
    rateLimitHitsPerHour: 1000,
    highRiskScore: 80,
    criticalRiskScore: 95,
  },
  
  // Performance thresholds
  performanceThresholds: {
    slowRequestMs: 2000,
    highMemoryMB: 512,
    highCpuPercent: 80,
  },
})
```

## 📱 Step 10: Real-time Monitoring

For real-time event monitoring, you can:

1. **WebSocket Integration** - Stream events to dashboard
2. **Metrics Endpoints** - HTTP endpoints for metrics
3. **Health Checks** - Monitor system health
4. **Alerting** - Set up alerts for critical events

Example metrics endpoint:
```typescript
@Controller('admin/events')
export class EventsAdminController {
  
  @Get('metrics')
  getMetrics() {
    return this.metricsListener.getConsolidatedMetrics();
  }

  @Get('security/summary')
  getSecuritySummary() {
    return this.securityListener.getSecuritySummary();
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Events not firing**: Check module imports and middleware order
2. **Memory leaks**: Adjust `maxListeners` and `metricsRetention`
3. **Performance impact**: Reduce logging verbosity or disable certain events
4. **Missing events**: Verify middleware registration and order

### Debug Mode
Run with debug logging to see all events:
```bash
DEBUG=events:* npm run start:dev
```

---

## 🎉 You're Ready!

Your events system is now configured and ready to run. Start the application and watch the comprehensive event logging in action!

```bash
npm run start:dev
```

The system will automatically emit and log events for all request lifecycle phases, providing complete visibility into your application's behavior. 🚀