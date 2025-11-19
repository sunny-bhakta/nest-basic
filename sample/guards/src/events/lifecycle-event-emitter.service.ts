import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  LifecycleEvent, 
  LifecycleEventName, 
  LifecycleEventWithMetadata, 
  EventMetadata,
  LIFECYCLE_EVENTS,
  BaseLifecycleEvent 
} from './lifecycle-events.interface';

@Injectable()
export class LifecycleEventEmitter {
  private readonly logger = new Logger(LifecycleEventEmitter.name);
  private readonly eventCounts = new Map<string, number>();
  private readonly eventHistory: LifecycleEventWithMetadata[] = [];
  private readonly maxHistorySize = 1000;

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a lifecycle event with metadata
   */
  emit<T extends LifecycleEvent>(
    eventName: LifecycleEventName,
    event: T,
    emittedBy?: string
  ): boolean {
    try {
      const metadata: EventMetadata = {
        emittedAt: new Date(),
        emittedBy: emittedBy || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        traceId: this.generateTraceId(),
      };

      const eventWithMetadata: LifecycleEventWithMetadata<T> = {
        event,
        metadata,
      };

      // Store in history
      this.storeEventInHistory(eventWithMetadata);

      // Update event counts
      this.updateEventCounts(eventName);

      // Emit the event
      const result = this.eventEmitter.emit(eventName, eventWithMetadata);

      this.logger.debug(
        `Event emitted: ${eventName} - RequestId: ${event.requestId} - By: ${emittedBy}`
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  /**
   * Emit request start event
   */
  emitRequestStart(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    method: string;
    url: string;
    headers: Record<string, string | string[]>;
    query: Record<string, any>;
    route?: string;
    controller?: string;
    handler?: string;
  }): boolean {
    return this.emit(LIFECYCLE_EVENTS.REQUEST_START, {
      ...event,
      timestamp: new Date(),
    }, 'request-middleware');
  }

  /**
   * Emit authentication event
   */
  emitAuthEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    action: 'attempt' | 'success' | 'failure';
    method?: string;
    reason?: string;
    duration?: number;
  }): boolean {
    const eventName = event.action === 'attempt' 
      ? LIFECYCLE_EVENTS.AUTH_ATTEMPT
      : event.action === 'success' 
        ? LIFECYCLE_EVENTS.AUTH_SUCCESS
        : LIFECYCLE_EVENTS.AUTH_FAILURE;

    return this.emit(eventName, {
      ...event,
      timestamp: new Date(),
    }, 'auth-guard');
  }

  /**
   * Emit authorization event
   */
  emitAuthzEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    action: 'check' | 'granted' | 'denied';
    resource?: string;
    permission?: string;
    accessLevel?: string;
    reason?: string;
    duration?: number;
  }): boolean {
    const eventName = event.action === 'check'
      ? LIFECYCLE_EVENTS.AUTHZ_CHECK
      : event.action === 'granted'
        ? LIFECYCLE_EVENTS.AUTHZ_GRANTED
        : LIFECYCLE_EVENTS.AUTHZ_DENIED;

    return this.emit(eventName, {
      ...event,
      timestamp: new Date(),
    }, 'authz-guard');
  }

  /**
   * Emit validation event
   */
  emitValidationEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    action: 'start' | 'success' | 'failure';
    target: 'body' | 'query' | 'params' | 'headers';
    validatorType: string;
    errors?: string[];
    sanitizedFields?: string[];
    transformedFields?: string[];
    duration?: number;
  }): boolean {
    const eventName = event.action === 'start'
      ? LIFECYCLE_EVENTS.VALIDATION_START
      : event.action === 'success'
        ? LIFECYCLE_EVENTS.VALIDATION_SUCCESS
        : LIFECYCLE_EVENTS.VALIDATION_FAILURE;

    return this.emit(eventName, {
      ...event,
      timestamp: new Date(),
    }, 'validation-pipe');
  }

  /**
   * Emit processing event
   */
  emitProcessingEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    action: 'start' | 'complete' | 'error';
    controller: string;
    handler: string;
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    cacheHit?: boolean;
    cacheKey?: string;
  }): boolean {
    const eventName = event.action === 'start'
      ? LIFECYCLE_EVENTS.PROCESSING_START
      : event.action === 'complete'
        ? LIFECYCLE_EVENTS.PROCESSING_COMPLETE
        : LIFECYCLE_EVENTS.PROCESSING_ERROR;

    return this.emit(eventName, {
      ...event,
      timestamp: new Date(),
    }, 'controller');
  }

  /**
   * Emit response event
   */
  emitResponseEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    statusCode: number;
    contentType?: string;
    contentLength?: number;
    duration: number;
    cacheStatus?: 'hit' | 'miss' | 'skip';
    compressionRatio?: number;
    headers?: Record<string, string | string[]>;
  }): boolean {
    return this.emit(LIFECYCLE_EVENTS.RESPONSE_SENT, {
      ...event,
      timestamp: new Date(),
    }, 'response-interceptor');
  }

  /**
   * Emit error event
   */
  emitErrorEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    error: {
      name: string;
      message: string;
      stack?: string;
      code?: string;
      statusCode?: number;
    };
    phase: 'middleware' | 'guard' | 'interceptor' | 'pipe' | 'controller' | 'filter';
    recovery?: 'handled' | 'unhandled';
    context?: Record<string, any>;
  }): boolean {
    return this.emit(LIFECYCLE_EVENTS.ERROR_OCCURRED, {
      ...event,
      timestamp: new Date(),
    }, 'error-filter');
  }

  /**
   * Emit security event
   */
  emitSecurityEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    type: 'attack_detected' | 'suspicious_activity' | 'rate_limit_exceeded' | 'ip_blocked' | 'auth_failure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: {
      attackType?: string;
      pattern?: string;
      threshold?: number;
      attempts?: number;
      blocked?: boolean;
    };
    action?: 'logged' | 'blocked' | 'rate_limited' | 'alerted';
  }): boolean {
    const eventName = event.type === 'attack_detected'
      ? LIFECYCLE_EVENTS.SECURITY_ATTACK_DETECTED
      : event.type === 'suspicious_activity'
        ? LIFECYCLE_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY
        : event.type === 'rate_limit_exceeded'
          ? LIFECYCLE_EVENTS.SECURITY_RATE_LIMITED
          : LIFECYCLE_EVENTS.SECURITY_IP_BLOCKED;

    return this.emit(eventName, {
      ...event,
      timestamp: new Date(),
    }, 'security-interceptor');
  }

  /**
   * Emit performance event
   */
  emitPerformanceEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    type: 'slow_request' | 'high_memory' | 'high_cpu' | 'cache_performance' | 'database_query';
    metrics: {
      duration?: number;
      memoryUsage?: number;
      cpuUsage?: number;
      cacheHitRatio?: number;
      queryTime?: number;
      queryCount?: number;
    };
    threshold?: number;
    severity: 'info' | 'warning' | 'error';
  }): boolean {
    const eventName = event.type === 'slow_request'
      ? LIFECYCLE_EVENTS.PERFORMANCE_SLOW_REQUEST
      : event.type === 'high_memory'
        ? LIFECYCLE_EVENTS.PERFORMANCE_HIGH_MEMORY
        : LIFECYCLE_EVENTS.PERFORMANCE_HIGH_CPU;

    return this.emit(eventName, {
      ...event,
      timestamp: new Date(),
    }, 'performance-interceptor');
  }

  /**
   * Emit cache event
   */
  emitCacheEvent(event: Omit<BaseLifecycleEvent, 'timestamp'> & {
    action: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'expire';
    key: string;
    ttl?: number;
    size?: number;
    hitRate?: number;
    evicted?: boolean;
  }): boolean {
    const eventName = event.action === 'hit'
      ? LIFECYCLE_EVENTS.CACHE_HIT
      : event.action === 'miss'
        ? LIFECYCLE_EVENTS.CACHE_MISS
        : event.action === 'set'
          ? LIFECYCLE_EVENTS.CACHE_SET
          : event.action === 'delete'
            ? LIFECYCLE_EVENTS.CACHE_DELETE
            : LIFECYCLE_EVENTS.CACHE_CLEAR;

    return this.emit(eventName, {
      ...event,
      timestamp: new Date(),
    }, 'cache-interceptor');
  }

  /**
   * Get event statistics
   */
  getEventStatistics(): Record<string, any> {
    const totalEvents = Array.from(this.eventCounts.values()).reduce((sum, count) => sum + count, 0);
    const recentEvents = this.eventHistory.filter(
      event => Date.now() - event.metadata.emittedAt.getTime() < 300000 // Last 5 minutes
    );

    return {
      totalEvents,
      eventCounts: Object.fromEntries(this.eventCounts.entries()),
      recentEventCount: recentEvents.length,
      historySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize,
      eventTypes: Array.from(this.eventCounts.keys()),
      averageEventsPerMinute: this.calculateAverageEventsPerMinute(),
    };
  }

  /**
   * Get recent events with optional filtering
   */
  getRecentEvents(
    limit = 100,
    eventNames?: LifecycleEventName[],
    timeRangeMs = 3600000 // 1 hour
  ): LifecycleEventWithMetadata[] {
    const cutoff = new Date(Date.now() - timeRangeMs);
    
    return this.eventHistory
      .filter(event => {
        if (event.metadata.emittedAt < cutoff) return false;
        if (eventNames && eventNames.length > 0) {
          // This is a simplified check - in a real implementation you'd need to store the event name
          return true; // For now, return all events
        }
        return true;
      })
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory.length = 0;
    this.eventCounts.clear();
    this.logger.debug('Event history cleared');
  }

  /**
   * Get event count for specific event type
   */
  getEventCount(eventName: LifecycleEventName): number {
    return this.eventCounts.get(eventName) || 0;
  }

  private storeEventInHistory(eventWithMetadata: LifecycleEventWithMetadata): void {
    this.eventHistory.push(eventWithMetadata);
    
    // Maintain max history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.splice(0, this.eventHistory.length - this.maxHistorySize);
    }
  }

  private updateEventCounts(eventName: LifecycleEventName): void {
    const current = this.eventCounts.get(eventName) || 0;
    this.eventCounts.set(eventName, current + 1);
  }

  private generateTraceId(): string {
    return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateAverageEventsPerMinute(): number {
    if (this.eventHistory.length === 0) return 0;
    
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour ago
    const recentEvents = this.eventHistory.filter(
      event => event.metadata.emittedAt.getTime() > oneHourAgo
    );
    
    return recentEvents.length / 60; // events per minute over the last hour
  }
}