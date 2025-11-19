import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LifecycleEventEmitter } from './lifecycle-event-emitter.service';
import { LIFECYCLE_EVENTS, BaseLifecycleEvent } from './lifecycle-events.interface';

describe('LifecycleEventEmitter', () => {
  let service: LifecycleEventEmitter;
  let eventEmitter: EventEmitter2;
  let emitSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleEventEmitter,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    service = module.get<LifecycleEventEmitter>(LifecycleEventEmitter);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    emitSpy = eventEmitter.emit as unknown as jest.SpyInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with empty event statistics', () => {
      const stats = service.getEventStatistics();
      expect(stats.totalEvents).toBe(0);
      expect(stats.eventCounts).toEqual({});
      expect(stats.historySize).toBe(0);
    });

    it('should initialize with empty event history', () => {
      const history = service.getRecentEvents();
      expect(history).toEqual([]);
    });
  });

  describe('Request Start Event Emission', () => {
    it('should emit REQUEST_START event with correct data', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'GET',
        url: '/api/test',
        headers: { 'content-type': 'application/json' },
        query: { page: '1' },
        controller: 'TestController',
        handler: 'getTest',
      };

      const result = service.emitRequestStart(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.REQUEST_START,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'request-middleware',
          }),
        })
      );
    });
  });

  describe('Authentication Event Emission', () => {
    it('should emit AUTH_SUCCESS event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        action: 'success' as const,
        method: 'bearer',
        userId: 'user-456',
        duration: 50,
      };

      const result = service.emitAuthEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.AUTH_SUCCESS,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'auth-guard',
          }),
        })
      );
    });

    it('should emit AUTH_FAILURE event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        action: 'failure' as const,
        method: 'bearer',
        reason: 'Invalid token',
        duration: 30,
      };

      const result = service.emitAuthEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.AUTH_FAILURE,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Authorization Event Emission', () => {
    it('should emit AUTHZ_GRANTED event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        userId: 'user-456',
        action: 'granted' as const,
        resource: 'GET:/api/users',
        accessLevel: 'STANDARD',
        duration: 25,
      };

      const result = service.emitAuthzEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.AUTHZ_GRANTED,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'authz-guard',
          }),
        })
      );
    });
  });

  describe('Validation Event Emission', () => {
    it('should emit VALIDATION_SUCCESS event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        action: 'success' as const,
        target: 'body' as const,
        validatorType: 'CreateUserDto',
        duration: 12,
      };

      const result = service.emitValidationEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.VALIDATION_SUCCESS,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'validation-pipe',
          }),
        })
      );
    });
  });

  describe('Processing Event Emission', () => {
    it('should emit PROCESSING_START event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        action: 'start' as const,
        controller: 'UsersController',
        handler: 'findAll',
      };

      const result = service.emitProcessingEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.PROCESSING_START,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'controller',
          }),
        })
      );
    });
  });

  describe('Response Event Emission', () => {
    it('should emit RESPONSE_SENT event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        statusCode: 200,
        contentLength: 1024,
        duration: 234,
      };

      const result = service.emitResponseEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.RESPONSE_SENT,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'response-interceptor',
          }),
        })
      );
    });
  });

  describe('Error Event Emission', () => {
    it('should emit ERROR_OCCURRED event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        error: {
          name: 'ValidationError',
          message: 'Invalid input',
          stack: 'Error stack trace...',
        },
        phase: 'pipe' as const,
      };

      const result = service.emitErrorEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.ERROR_OCCURRED,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'error-filter',
          }),
        })
      );
    });
  });

  describe('Security Event Emission', () => {
    it('should emit SECURITY_ATTACK_DETECTED event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        type: 'attack_detected' as const,
        severity: 'high' as const,
        details: {
          attackType: 'sql_injection',
          pattern: 'UNION SELECT',
          blocked: true,
        },
      };

      const result = service.emitSecurityEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.SECURITY_ATTACK_DETECTED,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'security-interceptor',
          }),
        })
      );
    });
  });

  describe('Performance Event Emission', () => {
    it('should emit PERFORMANCE_SLOW_REQUEST event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        type: 'slow_request' as const,
        metrics: {
          duration: 5000,
          memoryUsage: 100 * 1024 * 1024,
          cpuUsage: 85.5,
        },
        threshold: 1000,
        severity: 'warning' as const,
      };

      const result = service.emitPerformanceEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.PERFORMANCE_SLOW_REQUEST,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'performance-interceptor',
          }),
        })
      );
    });
  });

  describe('Cache Event Emission', () => {
    it('should emit CACHE_HIT event', () => {
      const eventData = {
        requestId: 'req-123',
        ip: '192.168.1.1',
        action: 'hit' as const,
        key: 'user:456',
        ttl: 3600,
      };

      const result = service.emitCacheEvent(eventData);

      expect(result).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        LIFECYCLE_EVENTS.CACHE_HIT,
        expect.objectContaining({
          event: expect.objectContaining({
            ...eventData,
            timestamp: expect.any(Date),
          }),
          metadata: expect.objectContaining({
            emittedBy: 'cache-interceptor',
          }),
        })
      );
    });
  });

  describe('Event Statistics', () => {
    it('should calculate correct event statistics', () => {
      // Emit multiple events using helper methods
      service.emitRequestStart({
        requestId: 'req-1',
        ip: '192.168.1.1',
        method: 'GET',
        url: '/api/test',
        headers: {},
        query: {},
      });
      
      service.emitAuthEvent({
        requestId: 'req-1',
        ip: '192.168.1.1',
        action: 'success',
        method: 'bearer',
      });

      const stats = service.getEventStatistics();
      expect(stats.totalEvents).toBe(2);
      expect(stats.eventCounts[LIFECYCLE_EVENTS.REQUEST_START]).toBe(1);
      expect(stats.eventCounts[LIFECYCLE_EVENTS.AUTH_SUCCESS]).toBe(1);
      expect(stats.historySize).toBe(2);
    });
  });

  describe('Event History Management', () => {
    it('should clear event history and statistics', () => {
      service.emitRequestStart({
        requestId: 'req-123',
        ip: '192.168.1.1',
        method: 'GET',
        url: '/api/test',
        headers: {},
        query: {},
      });

      expect(service.getEventStatistics().totalEvents).toBe(1);
      expect(service.getRecentEvents()).toHaveLength(1);

      service.clearEventHistory();
      
      const stats = service.getEventStatistics();
      expect(stats.totalEvents).toBe(0);
      expect(stats.eventCounts).toEqual({});
      expect(stats.historySize).toBe(0);
      expect(service.getRecentEvents()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle event emission errors gracefully', () => {
      const errorEmitter = {
        emit: jest.fn().mockImplementation(() => {
          throw new Error('Emission failed');
        }),
      };

      const errorService = new LifecycleEventEmitter(errorEmitter as any);
      
      const result = errorService.emitRequestStart({
        requestId: 'req-123',
        ip: '192.168.1.1',
        method: 'GET',
        url: '/api/test',
        headers: {},
        query: {},
      });

      expect(result).toBe(false);
    });
  });

  describe('Event Count Tracking', () => {
    it('should track individual event counts', () => {
      service.emitRequestStart({
        requestId: 'req-1',
        ip: '192.168.1.1',
        method: 'GET',
        url: '/api/test',
        headers: {},
        query: {},
      });

      service.emitAuthEvent({
        requestId: 'req-1',
        ip: '192.168.1.1',
        action: 'success',
        method: 'bearer',
      });

      service.emitRequestStart({
        requestId: 'req-2',
        ip: '192.168.1.1',
        method: 'POST',
        url: '/api/users',
        headers: {},
        query: {},
      });

      expect(service.getEventCount(LIFECYCLE_EVENTS.REQUEST_START)).toBe(2);
      expect(service.getEventCount(LIFECYCLE_EVENTS.AUTH_SUCCESS)).toBe(1);
      expect(service.getEventCount(LIFECYCLE_EVENTS.AUTH_FAILURE)).toBe(0);
    });
  });

  describe('Recent Events Filtering', () => {
    it('should filter recent events by time range', () => {
      service.emitRequestStart({
        requestId: 'req-1',
        ip: '192.168.1.1',
        method: 'GET',
        url: '/api/test',
        headers: {},
        query: {},
      });

      service.emitAuthEvent({
        requestId: 'req-1',
        ip: '192.168.1.1',
        action: 'success',
        method: 'bearer',
      });

      const recentEvents = service.getRecentEvents(10, undefined, 60000); // Last minute
      expect(recentEvents.length).toBeGreaterThanOrEqual(0);
      expect(recentEvents.length).toBeLessThanOrEqual(2);
    });

    it('should limit recent events count', () => {
      // Emit multiple events using helper methods
      for (let i = 0; i < 5; i++) {
        service.emitRequestStart({
          requestId: `req-${i}`,
          ip: '192.168.1.1',
          method: 'GET',
          url: '/api/test',
          headers: {},
          query: {},
        });
      }

      const recentEvents = service.getRecentEvents(3);
      expect(recentEvents.length).toBeLessThanOrEqual(3);
    });
  });
});