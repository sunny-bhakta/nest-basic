import { Test, TestingModule } from '@nestjs/testing';
import { LoggingEventListener } from './logging-event.listener';
import { 
  LIFECYCLE_EVENTS, 
  LifecycleEventWithMetadata,
  RequestStartEvent,
  ResponseEvent,
  AuthenticationEvent,
  AuthorizationEvent,
  ValidationEvent,
  ProcessingEvent,
  ErrorEvent,
  SecurityEvent,
  PerformanceEvent,
  CacheEvent
} from '../lifecycle-events.interface';

describe('LoggingEventListener', () => {
  let listener: LoggingEventListener;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingEventListener],
    }).compile();

    listener = module.get<LoggingEventListener>(LoggingEventListener);
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Request Events', () => {
    it('should handle request start events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          method: 'GET',
          url: '/api/users',
          headers: {},
          query: {},
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'request-middleware',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleRequestStart(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀 REQUEST START'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('GET /api/users'),
        expect.stringContaining('IP: 192.168.1.1')
      );
    });

    it('should handle response sent events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          statusCode: 200,
          contentLength: 1024,
          duration: 150,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'response-interceptor',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleResponseSent(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✅ RESPONSE'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Status: 200'),
        expect.stringContaining('Duration: 150ms'),
        expect.stringContaining('Size: 1.0KB')
      );
    });
  });

  describe('Authentication Events', () => {
    it('should handle authentication success events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'success',
          method: 'bearer',
          userId: 'user-456',
          duration: 50,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'auth-guard',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleAuthSuccess(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔐 AUTH SUCCESS'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('User: user-456'),
        expect.stringContaining('Duration: 50ms')
      );
    });

    it('should handle authentication failure events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'failure',
          method: 'bearer',
          reason: 'Invalid token',
          duration: 30,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'auth-guard',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleAuthFailure(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ AUTH FAILURE'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Reason: Invalid token'),
        expect.stringContaining('Duration: 30ms')
      );
    });
  });

  describe('Authorization Events', () => {
    it('should handle authorization granted events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          userId: 'user-456',
          action: 'granted',
          resource: 'GET:/api/users',
          accessLevel: 'STANDARD',
          duration: 25,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'authz-guard',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleAuthzGranted(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🛡️ AUTHZ GRANTED'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Resource: GET:/api/users'),
        expect.stringContaining('AccessLevel: STANDARD')
      );
    });

    it('should handle authorization denied events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          userId: 'user-456',
          action: 'denied',
          resource: 'DELETE:/api/admin',
          accessLevel: 'STANDARD',
          reason: 'Insufficient privileges',
          duration: 15,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'authz-guard',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleAuthzDenied(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚫 AUTHZ DENIED'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Resource: DELETE:/api/admin'),
        expect.stringContaining('Reason: Insufficient privileges')
      );
    });
  });

  describe('Validation Events', () => {
    it('should handle validation success events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'success',
          target: 'body',
          validatorType: 'CreateUserDto',
          duration: 12,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'validation-pipe',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleValidationSuccess(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✔️ VALIDATION SUCCESS'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Target: body'),
        expect.stringContaining('Validator: CreateUserDto')
      );
    });

    it('should handle validation failure events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'failure',
          target: 'body',
          validatorType: 'CreateUserDto',
          errors: ['email must be a valid email', 'password is too weak'],
          duration: 8,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'validation-pipe',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleValidationFailure(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ VALIDATION FAILURE'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Target: body'),
        expect.stringContaining('Errors: 2')
      );
    });
  });

  describe('Processing Events', () => {
    it('should handle processing start events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'start',
          controller: 'UsersController',
          handler: 'findAll',
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'controller',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleProcessingStart(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚙️ PROCESSING START'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('UsersController.findAll')
      );
    });

    it('should handle processing complete events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'complete',
          controller: 'UsersController',
          handler: 'findAll',
          duration: 156,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'controller',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleProcessingComplete(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('✨ PROCESSING COMPLETE'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('UsersController.findAll'),
        expect.stringContaining('Duration: 156ms')
      );
    });
  });

  describe('Error Events', () => {
    it('should handle error occurred events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          error: {
            name: 'ValidationError',
            message: 'Invalid input data',
            stack: 'Error stack trace...',
          },
          phase: 'pipe',
          recovery: 'handled',
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'error-filter',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleErrorOccurred(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💥 ERROR OCCURRED'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('ValidationError: Invalid input data'),
        expect.stringContaining('Phase: pipe')
      );
    });
  });

  describe('Security Events', () => {
    it('should handle security attack detected events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          type: 'attack_detected',
          severity: 'high',
          details: {
            attackType: 'sql_injection',
            pattern: 'UNION SELECT',
            blocked: true,
          },
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'security-interceptor',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleSecurityAttackDetected(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚨 SECURITY ATTACK'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Type: sql_injection'),
        expect.stringContaining('Severity: high'),
        expect.stringContaining('Blocked: true')
      );
    });

    it('should handle security suspicious activity events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          type: 'suspicious_activity',
          severity: 'medium',
          details: {
            threshold: 100,
            attempts: 150,
          },
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'security-interceptor',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleSecuritySuspiciousActivity(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ SECURITY SUSPICIOUS'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Severity: medium'),
        expect.stringContaining('IP: 192.168.1.1')
      );
    });
  });

  describe('Performance Events', () => {
    it('should handle performance slow request events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          type: 'slow_request',
          metrics: {
            duration: 5000,
            memoryUsage: 100 * 1024 * 1024,
            cpuUsage: 85.5,
          },
          threshold: 1000,
          severity: 'warning',
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'performance-interceptor',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handlePerformanceSlowRequest(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🐌 SLOW REQUEST'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Duration: 5000ms'),
        expect.stringContaining('Threshold: 1000ms')
      );
    });

    it('should handle performance high memory events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          type: 'high_memory',
          metrics: {
            memoryUsage: 500 * 1024 * 1024,
            cpuUsage: 45.2,
          },
          threshold: 200 * 1024 * 1024,
          severity: 'error',
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'performance-interceptor',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handlePerformanceHighMemory(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🧠 HIGH MEMORY'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Memory: 500.0MB'),
        expect.stringContaining('Threshold: 200.0MB')
      );
    });
  });

  describe('Cache Events', () => {
    it('should handle cache hit events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'hit',
          key: 'user:456',
          ttl: 3600,
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'cache-interceptor',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleCacheHit(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💾 CACHE HIT'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Key: user:456'),
        expect.stringContaining('TTL: 3600s')
      );
    });

    it('should handle cache miss events', () => {
      const payload: LifecycleEventWithMetadata = {
        event: {
          requestId: 'req-123',
          timestamp: new Date(),
          ip: '192.168.1.1',
          action: 'miss',
          key: 'user:789',
        },
        metadata: {
          emittedAt: new Date(),
          emittedBy: 'cache-interceptor',
          environment: 'test',
          version: '1.0.0',
          traceId: 'trace-123',
        },
      };

      listener.handleCacheMiss(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('💨 CACHE MISS'),
        expect.stringContaining('[req-123]'),
        expect.stringContaining('Key: user:789')
      );
    });
  });

  describe('Utility Functions', () => {
    it('should filter sensitive data from objects', () => {
      const sensitiveData = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
        token: 'bearer-token-123',
        authorization: 'Bearer xyz',
        cookie: 'session=abc',
        apiKey: 'api-key-456',
      };

      // Access private method through any type casting for testing
      const filtered = (listener as any).filterSensitiveData(sensitiveData);

      expect(filtered.username).toBe('john');
      expect(filtered.email).toBe('john@example.com');
      expect(filtered.password).toBe('[REDACTED]');
      expect(filtered.token).toBe('[REDACTED]');
      expect(filtered.authorization).toBe('[REDACTED]');
      expect(filtered.cookie).toBe('[REDACTED]');
      expect(filtered.apiKey).toBe('[REDACTED]');
    });

    it('should format bytes correctly', () => {
      // Access private method through any type casting for testing
      const formatBytes = (listener as any).formatBytes;

      expect(formatBytes(1024)).toBe('1.0KB');
      expect(formatBytes(1024 * 1024)).toBe('1.0MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0GB');
      expect(formatBytes(500)).toBe('500B');
    });

    it('should format duration correctly', () => {
      // Access private method through any type casting for testing
      const formatDuration = (listener as any).formatDuration;

      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(65000)).toBe('1m 5s');
    });
  });
});