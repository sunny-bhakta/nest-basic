import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LifecycleEventEmitter } from './lifecycle-event-emitter.service';
import { LoggingEventListener } from './listeners/logging-event.listener';
import { MetricsEventListener } from './listeners/metrics-event.listener';
import { SecurityEventListener } from './listeners/security-event.listener';
import { LifecycleRequestMiddleware } from './middleware/lifecycle-request.middleware';
import { LifecycleAuthzGuard } from './guards/lifecycle-authz.guard';
import { InterceptorsModule } from '../interceptors/interceptors.module';
// import { SecurityInterceptor } from '../interceptors/security.interceptor'; // REMOVED: Already handled by InterceptorsModule

/**
 * Events module that provides comprehensive request lifecycle monitoring
 * Integrates with EventEmitter2 to provide event-driven architecture
 * 
 * Features:
 * - Request lifecycle tracking
 * - Authentication and authorization events
 * - Security monitoring and threat detection
 * - Performance metrics collection
 * - Comprehensive logging with correlation IDs
 * - Real-time event processing
 */
@Global()
@Module({
  imports: [
    InterceptorsModule,
    EventEmitterModule.forRoot({
      // Set this to `true` to use wildcards
      wildcard: true,
      // The delimiter used to segment namespaces
      delimiter: '.',
      // Set this to `true` if you want to emit the newListener event
      newListener: false,
      // Set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // The maximum amount of listeners that can be assigned to an event
      maxListeners: 20,
      // Show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: true,
      // Disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
  ],
  providers: [
    // Core event emitter service
    LifecycleEventEmitter,
    
    // Event listeners
    LoggingEventListener,
    MetricsEventListener,
    SecurityEventListener,
    
    // Enhanced middleware and guards
    LifecycleRequestMiddleware,
    LifecycleAuthzGuard,
    // SecurityInterceptor - REMOVED: Already provided by InterceptorsModule
  ],
  exports: [
    // Export services for use in other modules
    LifecycleEventEmitter,
    LoggingEventListener,
    MetricsEventListener,
    SecurityEventListener,
    LifecycleRequestMiddleware,
    LifecycleAuthzGuard,
  ],
})
export class EventsModule {
  /**
   * Get consolidated metrics from all event listeners
   */
  static getConsolidatedMetrics(): any {
    // This would be implemented with dependency injection in a real scenario
    return {
      events: {
        // Event statistics would be gathered here
      },
      security: {
        // Security metrics would be gathered here
      },
      performance: {
        // Performance metrics would be gathered here
      },
    };
  }

  /**
   * Configuration interface for the events module
   */
  static forRoot(config?: EventsModuleConfig): any {
    return {
      module: EventsModule,
      imports: [
        EventEmitterModule.forRoot({
          wildcard: config?.wildcard ?? true,
          delimiter: config?.delimiter ?? '.',
          maxListeners: config?.maxListeners ?? 20,
          verboseMemoryLeak: config?.verboseMemoryLeak ?? true,
          ignoreErrors: config?.ignoreErrors ?? false,
        }),
      ],
    };
  }
}

/**
 * Configuration interface for EventsModule
 */
export interface EventsModuleConfig {
  // EventEmitter2 configuration
  wildcard?: boolean;
  delimiter?: string;
  maxListeners?: number;
  verboseMemoryLeak?: boolean;
  ignoreErrors?: boolean;
  
  // Event listener configuration
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableSecurity?: boolean;
  
  // Logging configuration
  logLevel?: 'error' | 'warn' | 'log' | 'debug' | 'verbose';
  sensitiveFields?: string[];
  
  // Metrics configuration
  metricsRetention?: number; // hours
  timeSeriesLength?: number;
  
  // Security configuration
  securityThresholds?: {
    authFailuresPerHour?: number;
    authzDenialsPerHour?: number;
    validationFailuresPerHour?: number;
    rateLimitHitsPerHour?: number;
    highRiskScore?: number;
    criticalRiskScore?: number;
  };
  
  // Performance configuration
  performanceThresholds?: {
    slowRequestMs?: number;
    highMemoryMB?: number;
    highCpuPercent?: number;
  };
}