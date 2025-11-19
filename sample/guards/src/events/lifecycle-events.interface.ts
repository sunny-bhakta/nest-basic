import { Injectable } from '@nestjs/common';

/**
 * Base interface for all request lifecycle events
 */
export interface BaseLifecycleEvent {
  requestId: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  userId?: string;
  correlationId?: string;
  sessionId?: string;
}

/**
 * Request Start Event - Fired when a request is first received
 */
export interface RequestStartEvent extends BaseLifecycleEvent {
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  query: Record<string, any>;
  route?: string;
  controller?: string;
  handler?: string;
}

/**
 * Authentication Event - Fired during authentication phase
 */
export interface AuthenticationEvent extends BaseLifecycleEvent {
  action: 'attempt' | 'success' | 'failure';
  method?: string; // bearer, basic, api-key, etc.
  reason?: string; // failure reason
  duration?: number; // authentication duration in ms
}

/**
 * Authorization Event - Fired during authorization phase
 */
export interface AuthorizationEvent extends BaseLifecycleEvent {
  action: 'check' | 'granted' | 'denied';
  resource?: string;
  permission?: string;
  accessLevel?: string;
  reason?: string; // denial reason
  duration?: number;
}

/**
 * Validation Event - Fired during input validation phase
 */
export interface ValidationEvent extends BaseLifecycleEvent {
  action: 'start' | 'success' | 'failure';
  target: 'body' | 'query' | 'params' | 'headers';
  validatorType: string; // ValidationPipe, ParseIntPipe, etc.
  errors?: string[];
  sanitizedFields?: string[];
  transformedFields?: string[];
  duration?: number;
}

/**
 * Processing Event - Fired during business logic processing
 */
export interface ProcessingEvent extends BaseLifecycleEvent {
  action: 'start' | 'complete' | 'error';
  controller: string;
  handler: string;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  cacheHit?: boolean;
  cacheKey?: string;
}

/**
 * Response Event - Fired when sending response
 */
export interface ResponseEvent extends BaseLifecycleEvent {
  statusCode: number;
  contentType?: string;
  contentLength?: number;
  duration: number; // total request duration
  cacheStatus?: 'hit' | 'miss' | 'skip';
  compressionRatio?: number;
  headers?: Record<string, string | string[]>;
}

/**
 * Error Event - Fired when an error occurs
 */
export interface ErrorEvent extends BaseLifecycleEvent {
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
}

/**
 * Security Event - Fired for security-related incidents
 */
export interface SecurityEvent extends BaseLifecycleEvent {
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
}

/**
 * Performance Event - Fired for performance monitoring
 */
export interface PerformanceEvent extends BaseLifecycleEvent {
  type: 'slow_request' | 'high_memory' | 'high_cpu' | 'cache_performance' | 'database_query';
  metrics: {
    duration?: number;
    memoryUsage?: number; // MB
    cpuUsage?: number; // %
    cacheHitRatio?: number; // %
    queryTime?: number; // ms
    queryCount?: number;
  };
  threshold?: number;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Cache Event - Fired for caching operations
 */
export interface CacheEvent extends BaseLifecycleEvent {
  action: 'hit' | 'miss' | 'set' | 'delete' | 'clear' | 'expire';
  key: string;
  ttl?: number;
  size?: number; // bytes
  hitRate?: number; // %
  evicted?: boolean;
}

/**
 * Rate Limit Event - Fired for rate limiting operations
 */
export interface RateLimitEvent extends BaseLifecycleEvent {
  action: 'allowed' | 'throttled' | 'blocked';
  limit: number;
  current: number;
  windowMs: number;
  retryAfter?: number; // seconds
  key: string;
}

/**
 * Audit Event - Fired for auditing purposes
 */
export interface AuditEvent extends BaseLifecycleEvent {
  action: string;
  resource: string;
  oldValue?: any;
  newValue?: any;
  success: boolean;
  reason?: string;
}

/**
 * Health Event - Fired for health monitoring
 */
export interface HealthEvent extends BaseLifecycleEvent {
  component: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  metrics?: Record<string, number>;
  message?: string;
  checkDuration?: number;
}

/**
 * Event names constants for type safety
 */
export const LIFECYCLE_EVENTS = {
  // Core request lifecycle
  REQUEST_START: 'request.start',
  REQUEST_END: 'request.end',
  
  // Authentication & Authorization
  AUTH_ATTEMPT: 'auth.attempt',
  AUTH_SUCCESS: 'auth.success',
  AUTH_FAILURE: 'auth.failure',
  AUTHZ_CHECK: 'authz.check',
  AUTHZ_GRANTED: 'authz.granted',
  AUTHZ_DENIED: 'authz.denied',
  
  // Validation
  VALIDATION_START: 'validation.start',
  VALIDATION_SUCCESS: 'validation.success',
  VALIDATION_FAILURE: 'validation.failure',
  
  // Processing
  PROCESSING_START: 'processing.start',
  PROCESSING_COMPLETE: 'processing.complete',
  PROCESSING_ERROR: 'processing.error',
  
  // Response
  RESPONSE_SENT: 'response.sent',
  
  // Errors
  ERROR_OCCURRED: 'error.occurred',
  ERROR_HANDLED: 'error.handled',
  
  // Security
  SECURITY_ATTACK_DETECTED: 'security.attack_detected',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  SECURITY_RATE_LIMITED: 'security.rate_limited',
  SECURITY_IP_BLOCKED: 'security.ip_blocked',
  
  // Performance
  PERFORMANCE_SLOW_REQUEST: 'performance.slow_request',
  PERFORMANCE_HIGH_MEMORY: 'performance.high_memory',
  PERFORMANCE_HIGH_CPU: 'performance.high_cpu',
  
  // Cache
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  CACHE_SET: 'cache.set',
  CACHE_DELETE: 'cache.delete',
  CACHE_CLEAR: 'cache.clear',
  
  // Rate Limiting
  RATE_LIMIT_ALLOWED: 'rate_limit.allowed',
  RATE_LIMIT_THROTTLED: 'rate_limit.throttled',
  RATE_LIMIT_BLOCKED: 'rate_limit.blocked',
  
  // Audit
  AUDIT_ACTION: 'audit.action',
  
  // Health
  HEALTH_CHECK: 'health.check',
  HEALTH_STATUS_CHANGED: 'health.status_changed',
} as const;

/**
 * Type union of all event names
 */
export type LifecycleEventName = typeof LIFECYCLE_EVENTS[keyof typeof LIFECYCLE_EVENTS];

/**
 * Type union of all event interfaces
 */
export type LifecycleEvent = 
  | RequestStartEvent
  | AuthenticationEvent
  | AuthorizationEvent
  | ValidationEvent
  | ProcessingEvent
  | ResponseEvent
  | ErrorEvent
  | SecurityEvent
  | PerformanceEvent
  | CacheEvent
  | RateLimitEvent
  | AuditEvent
  | HealthEvent;

/**
 * Event metadata interface
 */
export interface EventMetadata {
  emittedAt: Date;
  emittedBy: string; // component that emitted the event
  environment?: string;
  version?: string;
  traceId?: string;
  spanId?: string;
}

/**
 * Event with metadata wrapper
 */
export interface LifecycleEventWithMetadata<T extends LifecycleEvent = LifecycleEvent> {
  event: T;
  metadata: EventMetadata;
}

/**
 * Event filter interface for event listeners
 */
export interface EventFilter {
  eventNames?: LifecycleEventName[];
  requestId?: string;
  userId?: string;
  ip?: string;
  timeRange?: {
    start: Date;
    end: Date;
  };
  severity?: string[];
  phase?: string[];
}

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
  name: string;
  description?: string;
  enabled: boolean;
  filter?: EventFilter;
  async?: boolean;
  retries?: number;
  timeout?: number;
  priority?: number; // lower number = higher priority
}