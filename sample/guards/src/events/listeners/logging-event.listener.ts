import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { 
  LifecycleEventWithMetadata, 
  RequestStartEvent,
  AuthenticationEvent,
  AuthorizationEvent,
  ValidationEvent,
  ProcessingEvent,
  ResponseEvent,
  ErrorEvent,
  SecurityEvent,
  PerformanceEvent,
  CacheEvent,
  RateLimitEvent 
} from '../lifecycle-events.interface';
import { LIFECYCLE_EVENTS } from '../lifecycle-events.interface';

/**
 * Comprehensive logging listener that logs all lifecycle events
 * Provides structured logging with correlation IDs and context
 */
@Injectable()
export class LoggingEventListener {
  private readonly logger = new Logger(LoggingEventListener.name);
  private readonly sensitiveFields = ['password', 'token', 'authorization', 'secret', 'key', 'apikey'];

  @OnEvent(LIFECYCLE_EVENTS.REQUEST_START)
  handleRequestStart(payload: LifecycleEventWithMetadata<RequestStartEvent>): void {
    const { event, metadata } = payload;
    
    // Sanitize headers for logging
    const sanitizedHeaders = this.sanitizeData(event.headers);
    
    this.logger.log(
      `🚀 REQUEST START [${event.requestId}] ${event.method} ${event.url}`,
      {
        requestId: event.requestId,
        method: event.method,
        url: event.url,
        ip: event.ip,
        userAgent: event.userAgent,
        controller: event.controller,
        handler: event.handler,
        headers: sanitizedHeaders,
        query: event.query,
        timestamp: event.timestamp,
        traceId: metadata.traceId,
        emittedBy: metadata.emittedBy,
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTH_ATTEMPT)
  handleAuthAttempt(payload: LifecycleEventWithMetadata<AuthenticationEvent>): void {
    const { event } = payload;
    this.logger.log(
      `🔐 AUTH ATTEMPT [${event.requestId}] Method: ${event.method || 'unknown'}`,
      { requestId: event.requestId, method: event.method, ip: event.ip }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTH_SUCCESS)
  handleAuthSuccess(payload: LifecycleEventWithMetadata<AuthenticationEvent>): void {
    const { event } = payload;
    this.logger.log(
      `✅ AUTH SUCCESS [${event.requestId}] User: ${event.userId || 'anonymous'} Duration: ${event.duration}ms`,
      { 
        requestId: event.requestId, 
        userId: event.userId, 
        method: event.method,
        duration: event.duration,
        ip: event.ip 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTH_FAILURE)
  handleAuthFailure(payload: LifecycleEventWithMetadata<AuthenticationEvent>): void {
    const { event } = payload;
    this.logger.warn(
      `❌ AUTH FAILURE [${event.requestId}] Reason: ${event.reason || 'unknown'} Duration: ${event.duration}ms`,
      { 
        requestId: event.requestId, 
        reason: event.reason, 
        method: event.method,
        duration: event.duration,
        ip: event.ip 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTHZ_GRANTED)
  handleAuthzGranted(payload: LifecycleEventWithMetadata<AuthorizationEvent>): void {
    const { event } = payload;
    this.logger.log(
      `🛡️ AUTHZ GRANTED [${event.requestId}] Resource: ${event.resource} AccessLevel: ${event.accessLevel}`,
      { 
        requestId: event.requestId, 
        resource: event.resource, 
        accessLevel: event.accessLevel,
        userId: event.userId 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTHZ_DENIED)
  handleAuthzDenied(payload: LifecycleEventWithMetadata<AuthorizationEvent>): void {
    const { event } = payload;
    this.logger.warn(
      `🚫 AUTHZ DENIED [${event.requestId}] Resource: ${event.resource} Reason: ${event.reason}`,
      { 
        requestId: event.requestId, 
        resource: event.resource, 
        reason: event.reason,
        accessLevel: event.accessLevel,
        userId: event.userId,
        ip: event.ip 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.VALIDATION_SUCCESS)
  handleValidationSuccess(payload: LifecycleEventWithMetadata<ValidationEvent>): void {
    const { event } = payload;
    this.logger.debug(
      `✔️ VALIDATION SUCCESS [${event.requestId}] Target: ${event.target} Validator: ${event.validatorType}`,
      { 
        requestId: event.requestId, 
        target: event.target, 
        validatorType: event.validatorType,
        transformedFields: event.transformedFields,
        sanitizedFields: event.sanitizedFields,
        duration: event.duration 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.VALIDATION_FAILURE)
  handleValidationFailure(payload: LifecycleEventWithMetadata<ValidationEvent>): void {
    const { event } = payload;
    this.logger.warn(
      `❗ VALIDATION FAILURE [${event.requestId}] Target: ${event.target} Errors: ${event.errors?.length || 0}`,
      { 
        requestId: event.requestId, 
        target: event.target, 
        validatorType: event.validatorType,
        errors: event.errors,
        duration: event.duration,
        ip: event.ip 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.PROCESSING_START)
  handleProcessingStart(payload: LifecycleEventWithMetadata<ProcessingEvent>): void {
    const { event } = payload;
    this.logger.debug(
      `⚙️ PROCESSING START [${event.requestId}] ${event.controller}.${event.handler}`,
      { 
        requestId: event.requestId, 
        controller: event.controller, 
        handler: event.handler,
        cacheHit: event.cacheHit,
        cacheKey: event.cacheKey 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.PROCESSING_COMPLETE)
  handleProcessingComplete(payload: LifecycleEventWithMetadata<ProcessingEvent>): void {
    const { event } = payload;
    this.logger.log(
      `✨ PROCESSING COMPLETE [${event.requestId}] ${event.controller}.${event.handler} Duration: ${event.duration}ms`,
      { 
        requestId: event.requestId, 
        controller: event.controller, 
        handler: event.handler,
        duration: event.duration,
        memoryUsage: event.memoryUsage,
        cpuUsage: event.cpuUsage,
        cacheHit: event.cacheHit 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.PROCESSING_ERROR)
  handleProcessingError(payload: LifecycleEventWithMetadata<ProcessingEvent>): void {
    const { event } = payload;
    this.logger.error(
      `💥 PROCESSING ERROR [${event.requestId}] ${event.controller}.${event.handler} Duration: ${event.duration}ms`,
      { 
        requestId: event.requestId, 
        controller: event.controller, 
        handler: event.handler,
        duration: event.duration,
        memoryUsage: event.memoryUsage 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.RESPONSE_SENT)
  handleResponseSent(payload: LifecycleEventWithMetadata<ResponseEvent>): void {
    const { event } = payload;
    const statusEmoji = this.getStatusEmoji(event.statusCode);
    
    this.logger.log(
      `${statusEmoji} RESPONSE [${event.requestId}] Status: ${event.statusCode} Duration: ${event.duration}ms Size: ${event.contentLength || 0}bytes`,
      { 
        requestId: event.requestId, 
        statusCode: event.statusCode,
        contentType: event.contentType,
        contentLength: event.contentLength,
        duration: event.duration,
        cacheStatus: event.cacheStatus,
        compressionRatio: event.compressionRatio,
        userId: event.userId,
        ip: event.ip 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.ERROR_OCCURRED)
  handleErrorOccurred(payload: LifecycleEventWithMetadata<ErrorEvent>): void {
    const { event } = payload;
    this.logger.error(
      `🔥 ERROR [${event.requestId}] ${event.error.name}: ${event.error.message} Phase: ${event.phase}`,
      { 
        requestId: event.requestId, 
        error: event.error,
        phase: event.phase,
        recovery: event.recovery,
        context: event.context,
        userId: event.userId,
        ip: event.ip 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.SECURITY_ATTACK_DETECTED)
  handleSecurityAttack(payload: LifecycleEventWithMetadata<SecurityEvent>): void {
    const { event } = payload;
    this.logger.error(
      `🚨 SECURITY ALERT [${event.requestId}] Attack: ${event.details.attackType} Severity: ${event.severity} Action: ${event.action}`,
      { 
        requestId: event.requestId, 
        type: event.type,
        severity: event.severity,
        details: event.details,
        action: event.action,
        ip: event.ip,
        userAgent: event.userAgent 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.SECURITY_SUSPICIOUS_ACTIVITY)
  handleSuspiciousActivity(payload: LifecycleEventWithMetadata<SecurityEvent>): void {
    const { event } = payload;
    this.logger.warn(
      `⚠️ SUSPICIOUS ACTIVITY [${event.requestId}] Severity: ${event.severity} Attempts: ${event.details.attempts}`,
      { 
        requestId: event.requestId, 
        type: event.type,
        severity: event.severity,
        details: event.details,
        ip: event.ip 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.PERFORMANCE_SLOW_REQUEST)
  handleSlowRequest(payload: LifecycleEventWithMetadata<PerformanceEvent>): void {
    const { event } = payload;
    this.logger.warn(
      `🐌 SLOW REQUEST [${event.requestId}] Duration: ${event.metrics.duration}ms Threshold: ${event.threshold}ms`,
      { 
        requestId: event.requestId, 
        type: event.type,
        metrics: event.metrics,
        threshold: event.threshold,
        severity: event.severity,
        userId: event.userId 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.PERFORMANCE_HIGH_MEMORY)
  handleHighMemory(payload: LifecycleEventWithMetadata<PerformanceEvent>): void {
    const { event } = payload;
    this.logger.warn(
      `🧠 HIGH MEMORY [${event.requestId}] Usage: ${event.metrics.memoryUsage}MB Threshold: ${event.threshold}MB`,
      { 
        requestId: event.requestId, 
        type: event.type,
        metrics: event.metrics,
        threshold: event.threshold,
        severity: event.severity 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.CACHE_HIT)
  handleCacheHit(payload: LifecycleEventWithMetadata<CacheEvent>): void {
    const { event } = payload;
    this.logger.debug(
      `💾 CACHE HIT [${event.requestId}] Key: ${event.key} TTL: ${event.ttl}s Hit Rate: ${event.hitRate}%`,
      { 
        requestId: event.requestId, 
        action: event.action,
        key: event.key,
        ttl: event.ttl,
        hitRate: event.hitRate 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.CACHE_MISS)
  handleCacheMiss(payload: LifecycleEventWithMetadata<CacheEvent>): void {
    const { event } = payload;
    this.logger.debug(
      `📭 CACHE MISS [${event.requestId}] Key: ${event.key}`,
      { 
        requestId: event.requestId, 
        action: event.action,
        key: event.key 
      }
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.RATE_LIMIT_THROTTLED)
  handleRateLimitThrottled(payload: LifecycleEventWithMetadata<RateLimitEvent>): void {
    const { event } = payload;
    this.logger.warn(
      `🚦 RATE LIMITED [${event.requestId}] ${event.current}/${event.limit} Retry After: ${event.retryAfter}s`,
      { 
        requestId: event.requestId, 
        action: event.action,
        limit: event.limit,
        current: event.current,
        retryAfter: event.retryAfter,
        key: event.key,
        ip: event.ip 
      }
    );
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = Array.isArray(data) ? [] : {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.sensitiveFields.some(field => lowerKey.includes(field));
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private getStatusEmoji(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return '✅';
    if (statusCode >= 300 && statusCode < 400) return '↩️';
    if (statusCode >= 400 && statusCode < 500) return '⚠️';
    if (statusCode >= 500) return '💥';
    return '❓';
  }
}