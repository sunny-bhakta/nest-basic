import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsModule } from './events.module';
import { LifecycleEventEmitter } from './lifecycle-event-emitter.service';
import { LoggingEventListener } from './listeners/logging-event.listener';
import { MetricsEventListener } from './listeners/metrics-event.listener';
import { SecurityEventListener } from './listeners/security-event.listener';
import { LifecycleRequestMiddleware } from './middleware/lifecycle-request.middleware';
import { LifecycleAuthzGuard } from './guards/lifecycle-authz.guard';

describe('EventsModule', () => {
  describe('Module Configuration', () => {
    it('should configure with default options', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot()],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      // Verify core services are available
      expect(module.get(LifecycleEventEmitter)).toBeDefined();
      expect(module.get(LoggingEventListener)).toBeDefined();
      expect(module.get(MetricsEventListener)).toBeDefined();
      expect(module.get(SecurityEventListener)).toBeDefined();
      expect(module.get(LifecycleRequestMiddleware)).toBeDefined();
      expect(module.get(LifecycleAuthzGuard)).toBeDefined();

      await app.close();
    });

    it('should configure with custom options', async () => {
      const customOptions = {
        enableLogging: true,
        enableMetrics: true,
        enableSecurity: true,
        logLevel: 'debug' as const,
        metricsRetention: 48,
        securityThresholds: {
          authFailuresPerHour: 5,
          highRiskScore: 80,
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot(customOptions)],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      // Verify services are available with custom configuration
      expect(module.get(LifecycleEventEmitter)).toBeDefined();
      expect(module.get(LoggingEventListener)).toBeDefined();
      expect(module.get(MetricsEventListener)).toBeDefined();
      expect(module.get(SecurityEventListener)).toBeDefined();

      await app.close();
    });

    it('should configure EventEmitter2 correctly', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot()],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      // EventEmitter2 should be available through EventEmitterModule
      const eventEmitterModule = module.get('EventEmitterModuleOptions');
      expect(eventEmitterModule).toBeDefined();

      await app.close();
    });
  });

  describe('Module Exports', () => {
    it('should export all required services', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot()],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      // Test that all exported services can be resolved
      const services = [
        LifecycleEventEmitter,
        LoggingEventListener,
        MetricsEventListener,
        SecurityEventListener,
        LifecycleRequestMiddleware,
        LifecycleAuthzGuard,
      ];

      for (const Service of services) {
        const serviceInstance = module.get(Service);
        expect(serviceInstance).toBeDefined();
        expect(serviceInstance).toBeInstanceOf(Service);
      }

      await app.close();
    });
  });

  describe('Service Integration', () => {
    it('should wire services correctly', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot()],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      const eventEmitter = module.get(LifecycleEventEmitter);
      const loggingListener = module.get(LoggingEventListener);
      const metricsListener = module.get(MetricsEventListener);
      const securityListener = module.get(SecurityEventListener);

      // Verify services are properly initialized
      expect(eventEmitter).toBeDefined();
      expect(loggingListener).toBeDefined();
      expect(metricsListener).toBeDefined();
      expect(securityListener).toBeDefined();

      // Test event emission and handling
      const eventStats = eventEmitter.getEventStatistics();
      expect(eventStats.totalEvents).toBe(0);

      // Emit a test event
      eventEmitter.emitRequestStart({
        requestId: 'test-req-123',
        ip: '127.0.0.1',
        method: 'GET',
        url: '/test',
        headers: {},
        query: {},
      });

      // Verify event was processed
      const updatedStats = eventEmitter.getEventStatistics();
      expect(updatedStats.totalEvents).toBe(1);

      await app.close();
    });

    it('should handle event listener exceptions gracefully', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot()],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      const eventEmitter = module.get(LifecycleEventEmitter);

      // This should not throw even if listeners have issues
      expect(() => {
        eventEmitter.emitRequestStart({
          requestId: 'test-req-456',
          ip: '127.0.0.1',
          method: 'POST',
          url: '/test-error',
          headers: {},
          query: {},
        });
      }).not.toThrow();

      await app.close();
    });
  });

  describe('Configuration Validation', () => {
    it('should handle minimal configuration', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot({})],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      expect(module.get(LifecycleEventEmitter)).toBeDefined();
      
      await app.close();
    });

    it('should handle configuration with disabled features', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot({
          enableLogging: false,
          enableMetrics: false,
          enableSecurity: false,
        })],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      // Core services should still be available
      expect(module.get(LifecycleEventEmitter)).toBeDefined();
      expect(module.get(LoggingEventListener)).toBeDefined();
      expect(module.get(MetricsEventListener)).toBeDefined();
      expect(module.get(SecurityEventListener)).toBeDefined();

      await app.close();
    });
  });

  describe('Event Flow Integration', () => {
    it('should process complete request lifecycle', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [EventsModule.forRoot()],
      }).compile();

      const app = module.createNestApplication();
      await app.init();

      const eventEmitter = module.get(LifecycleEventEmitter);
      const metricsListener = module.get(MetricsEventListener);

      // Simulate complete request lifecycle
      const requestId = 'integration-test-123';

      // 1. Request start
      eventEmitter.emitRequestStart({
        requestId,
        ip: '127.0.0.1',
        method: 'GET',
        url: '/api/integration-test',
        headers: { 'user-agent': 'Test Agent' },
        query: {},
      });

      // 2. Authentication
      eventEmitter.emitAuthEvent({
        requestId,
        ip: '127.0.0.1',
        action: 'success',
        method: 'bearer',
        userId: 'test-user',
      });

      // 3. Authorization
      eventEmitter.emitAuthzEvent({
        requestId,
        ip: '127.0.0.1',
        userId: 'test-user',
        action: 'granted',
        resource: 'GET:/api/integration-test',
      });

      // 4. Processing
      eventEmitter.emitProcessingEvent({
        requestId,
        ip: '127.0.0.1',
        action: 'start',
        controller: 'TestController',
        handler: 'integrationTest',
      });

      eventEmitter.emitProcessingEvent({
        requestId,
        ip: '127.0.0.1',
        action: 'complete',
        controller: 'TestController',
        handler: 'integrationTest',
        duration: 50,
      });

      // 5. Response
      eventEmitter.emitResponseEvent({
        requestId,
        ip: '127.0.0.1',
        statusCode: 200,
        duration: 75,
      });

      // Verify events were processed
      const stats = eventEmitter.getEventStatistics();
      expect(stats.totalEvents).toBe(6); // 6 events emitted

      // Verify metrics were collected
      const metrics = metricsListener.getMetricsSummary();
      expect(metrics.overview.totalRequests).toBeGreaterThan(0);

      await app.close();
    });
  });
});