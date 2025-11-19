import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { 
  LifecycleEventWithMetadata, 
  RequestStartEvent,
  AuthenticationEvent,
  ValidationEvent,
  ProcessingEvent,
  ResponseEvent,
  ErrorEvent,
  PerformanceEvent,
  CacheEvent,
  RateLimitEvent 
} from '../lifecycle-events.interface';
import { LIFECYCLE_EVENTS } from '../lifecycle-events.interface';

interface MetricData {
  timestamp: Date;
  value: number;
  tags?: Record<string, string>;
}

interface RequestMetrics {
  requestId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  statusCode?: number;
  method?: string;
  url?: string;
  controller?: string;
  handler?: string;
  userId?: string;
  ip?: string;
  authDuration?: number;
  validationDuration?: number;
  processingDuration?: number;
  cacheHit?: boolean;
  errors: string[];
}

/**
 * Metrics collection listener that aggregates performance and usage metrics
 * Provides comprehensive analytics for monitoring and optimization
 */
@Injectable()
export class MetricsEventListener {
  private readonly logger = new Logger(MetricsEventListener.name);
  private readonly requestMetrics = new Map<string, RequestMetrics>();
  private readonly aggregatedMetrics = {
    requestCount: 0,
    responseTimeSum: 0,
    errorCount: 0,
    authAttempts: 0,
    authFailures: 0,
    validationFailures: 0,
    cacheHits: 0,
    cacheMisses: 0,
    rateLimitHits: 0,
    slowRequests: 0,
    highMemoryEvents: 0,
    statusCodeCounts: new Map<number, number>(),
    endpointCounts: new Map<string, number>(),
    userActivityCounts: new Map<string, number>(),
    ipCounts: new Map<string, number>(),
    errorTypeCounts: new Map<string, number>(),
  };

  // Time-series metrics (last 24 hours)
  private readonly timeSeriesMetrics = {
    requests: [] as MetricData[],
    responseTimes: [] as MetricData[],
    errors: [] as MetricData[],
    authFailures: [] as MetricData[],
    cacheHitRatio: [] as MetricData[],
    memoryUsage: [] as MetricData[],
  };

  private readonly maxTimeSeriesLength = 1440; // 24 hours in minutes

  @OnEvent(LIFECYCLE_EVENTS.REQUEST_START)
  handleRequestStart(payload: LifecycleEventWithMetadata<RequestStartEvent>): void {
    const { event } = payload;
    
    const requestMetric: RequestMetrics = {
      requestId: event.requestId,
      startTime: event.timestamp,
      method: event.method,
      url: event.url,
      controller: event.controller,
      handler: event.handler,
      userId: event.userId,
      ip: event.ip,
      errors: [],
    };

    this.requestMetrics.set(event.requestId, requestMetric);
    this.aggregatedMetrics.requestCount++;

    // Add to time series
    this.addToTimeSeries(this.timeSeriesMetrics.requests, 1, {
      method: event.method,
      endpoint: `${event.method} ${event.url}`,
    });

    // Track endpoint usage
    const endpoint = `${event.method} ${event.url}`;
    this.incrementMapCount(this.aggregatedMetrics.endpointCounts, endpoint);

    // Track IP usage
    if (event.ip) {
      this.incrementMapCount(this.aggregatedMetrics.ipCounts, event.ip);
    }

    // Track user activity
    if (event.userId) {
      this.incrementMapCount(this.aggregatedMetrics.userActivityCounts, event.userId);
    }
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTH_ATTEMPT)
  handleAuthAttempt(payload: LifecycleEventWithMetadata<AuthenticationEvent>): void {
    this.aggregatedMetrics.authAttempts++;
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTH_SUCCESS)
  handleAuthSuccess(payload: LifecycleEventWithMetadata<AuthenticationEvent>): void {
    const { event } = payload;
    const requestMetric = this.requestMetrics.get(event.requestId);
    
    if (requestMetric && event.duration) {
      requestMetric.authDuration = event.duration;
    }
  }

  @OnEvent(LIFECYCLE_EVENTS.AUTH_FAILURE)
  handleAuthFailure(payload: LifecycleEventWithMetadata<AuthenticationEvent>): void {
    const { event } = payload;
    this.aggregatedMetrics.authFailures++;
    
    this.addToTimeSeries(this.timeSeriesMetrics.authFailures, 1, {
      ip: event.ip || 'unknown',
      method: event.method || 'unknown',
      reason: event.reason || 'unknown',
    });
  }

  @OnEvent(LIFECYCLE_EVENTS.VALIDATION_FAILURE)
  handleValidationFailure(payload: LifecycleEventWithMetadata<ValidationEvent>): void {
    const { event } = payload;
    const requestMetric = this.requestMetrics.get(event.requestId);
    
    this.aggregatedMetrics.validationFailures++;
    
    if (requestMetric) {
      requestMetric.errors.push(`Validation failed: ${event.validatorType}`);
      requestMetric.validationDuration = event.duration;
    }
  }

  @OnEvent(LIFECYCLE_EVENTS.PROCESSING_COMPLETE)
  handleProcessingComplete(payload: LifecycleEventWithMetadata<ProcessingEvent>): void {
    const { event } = payload;
    const requestMetric = this.requestMetrics.get(event.requestId);
    
    if (requestMetric && event.duration) {
      requestMetric.processingDuration = event.duration;
      requestMetric.cacheHit = event.cacheHit;
    }
  }

  @OnEvent(LIFECYCLE_EVENTS.RESPONSE_SENT)
  handleResponseSent(payload: LifecycleEventWithMetadata<ResponseEvent>): void {
    const { event } = payload;
    const requestMetric = this.requestMetrics.get(event.requestId);
    
    if (requestMetric) {
      requestMetric.endTime = event.timestamp;
      requestMetric.duration = event.duration;
      requestMetric.statusCode = event.statusCode;

      this.aggregatedMetrics.responseTimeSum += event.duration;

      // Track status codes
      this.incrementMapCount(this.aggregatedMetrics.statusCodeCounts, event.statusCode);

      // Add response time to time series
      this.addToTimeSeries(this.timeSeriesMetrics.responseTimes, event.duration, {
        statusCode: event.statusCode.toString(),
        endpoint: `${requestMetric.method} ${requestMetric.url}`,
        cacheStatus: event.cacheStatus || 'none',
      });

      // Check for slow requests
      if (event.duration > 1000) { // Slow if > 1 second
        this.aggregatedMetrics.slowRequests++;
      }
    }
  }

  @OnEvent(LIFECYCLE_EVENTS.ERROR_OCCURRED)
  handleErrorOccurred(payload: LifecycleEventWithMetadata<ErrorEvent>): void {
    const { event } = payload;
    const requestMetric = this.requestMetrics.get(event.requestId);
    
    this.aggregatedMetrics.errorCount++;
    
    // Track error types
    this.incrementMapCount(this.aggregatedMetrics.errorTypeCounts, event.error.name);

    if (requestMetric) {
      requestMetric.errors.push(`${event.error.name}: ${event.error.message}`);
    }

    // Add to time series
    this.addToTimeSeries(this.timeSeriesMetrics.errors, 1, {
      errorType: event.error.name,
      phase: event.phase,
      statusCode: event.error.statusCode?.toString() || 'unknown',
    });
  }

  @OnEvent(LIFECYCLE_EVENTS.CACHE_HIT)
  handleCacheHit(payload: LifecycleEventWithMetadata<CacheEvent>): void {
    this.aggregatedMetrics.cacheHits++;
    this.updateCacheHitRatio();
  }

  @OnEvent(LIFECYCLE_EVENTS.CACHE_MISS)
  handleCacheMiss(payload: LifecycleEventWithMetadata<CacheEvent>): void {
    this.aggregatedMetrics.cacheMisses++;
    this.updateCacheHitRatio();
  }

  @OnEvent(LIFECYCLE_EVENTS.RATE_LIMIT_THROTTLED)
  handleRateLimitThrottled(payload: LifecycleEventWithMetadata<RateLimitEvent>): void {
    const { event } = payload;
    this.aggregatedMetrics.rateLimitHits++;
    
    this.logger.warn(
      `Rate limit hit for ${event.key}: ${event.current}/${event.limit} requests`
    );
  }

  @OnEvent(LIFECYCLE_EVENTS.PERFORMANCE_SLOW_REQUEST)
  handleSlowRequest(payload: LifecycleEventWithMetadata<PerformanceEvent>): void {
    this.aggregatedMetrics.slowRequests++;
  }

  @OnEvent(LIFECYCLE_EVENTS.PERFORMANCE_HIGH_MEMORY)
  handleHighMemory(payload: LifecycleEventWithMetadata<PerformanceEvent>): void {
    const { event } = payload;
    this.aggregatedMetrics.highMemoryEvents++;
    
    this.addToTimeSeries(this.timeSeriesMetrics.memoryUsage, event.metrics.memoryUsage || 0, {
      severity: event.severity,
      threshold: event.threshold?.toString() || 'unknown',
    });
  }

  /**
   * Get comprehensive metrics summary
   */
  getMetricsSummary(): any {
    const totalRequests = this.aggregatedMetrics.requestCount;
    const averageResponseTime = totalRequests > 0 
      ? this.aggregatedMetrics.responseTimeSum / totalRequests 
      : 0;
    const errorRate = totalRequests > 0 
      ? (this.aggregatedMetrics.errorCount / totalRequests) * 100 
      : 0;
    const authFailureRate = this.aggregatedMetrics.authAttempts > 0
      ? (this.aggregatedMetrics.authFailures / this.aggregatedMetrics.authAttempts) * 100
      : 0;
    const cacheHitRate = (this.aggregatedMetrics.cacheHits + this.aggregatedMetrics.cacheMisses) > 0
      ? (this.aggregatedMetrics.cacheHits / (this.aggregatedMetrics.cacheHits + this.aggregatedMetrics.cacheMisses)) * 100
      : 0;

    return {
      overview: {
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100,
        authFailureRate: Math.round(authFailureRate * 100) / 100,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
        slowRequestCount: this.aggregatedMetrics.slowRequests,
        rateLimitHits: this.aggregatedMetrics.rateLimitHits,
        highMemoryEvents: this.aggregatedMetrics.highMemoryEvents,
      },
      statusCodes: Object.fromEntries(this.aggregatedMetrics.statusCodeCounts.entries()),
      topEndpoints: this.getTopEntries(this.aggregatedMetrics.endpointCounts, 10),
      topUsers: this.getTopEntries(this.aggregatedMetrics.userActivityCounts, 10),
      topIPs: this.getTopEntries(this.aggregatedMetrics.ipCounts, 10),
      errorTypes: Object.fromEntries(this.aggregatedMetrics.errorTypeCounts.entries()),
      activeRequests: this.getActiveRequestCount(),
      requestsInLastHour: this.getRequestsInTimeRange(3600000), // 1 hour
      requestsInLastDay: this.getRequestsInTimeRange(86400000), // 24 hours
    };
  }

  /**
   * Get time series data for visualization
   */
  getTimeSeriesData(): any {
    return {
      requests: this.aggregateTimeSeriesByMinute(this.timeSeriesMetrics.requests),
      responseTimes: this.aggregateTimeSeriesByMinute(this.timeSeriesMetrics.responseTimes),
      errors: this.aggregateTimeSeriesByMinute(this.timeSeriesMetrics.errors),
      authFailures: this.aggregateTimeSeriesByMinute(this.timeSeriesMetrics.authFailures),
      cacheHitRatio: this.timeSeriesMetrics.cacheHitRatio.slice(-60), // Last hour
      memoryUsage: this.timeSeriesMetrics.memoryUsage.slice(-60), // Last hour
    };
  }

  /**
   * Get detailed request analytics
   */
  getRequestAnalytics(timeRangeMs = 3600000): any { // Default 1 hour
    const cutoff = new Date(Date.now() - timeRangeMs);
    const recentRequests = Array.from(this.requestMetrics.values())
      .filter(req => req.startTime > cutoff);

    const completedRequests = recentRequests.filter(req => req.endTime);
    const durations = completedRequests
      .filter(req => req.duration)
      .map(req => req.duration!);

    return {
      totalRequests: recentRequests.length,
      completedRequests: completedRequests.length,
      inProgressRequests: recentRequests.length - completedRequests.length,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0,
      medianDuration: this.getMedian(durations),
      p95Duration: this.getPercentile(durations, 95),
      p99Duration: this.getPercentile(durations, 99),
      requestsWithErrors: recentRequests.filter(req => req.errors.length > 0).length,
      cacheHitRequests: recentRequests.filter(req => req.cacheHit).length,
      slowRequests: durations.filter(d => d > 1000).length,
    };
  }

  /**
   * Clear metrics (useful for testing or periodic cleanup)
   */
  clearMetrics(): void {
    this.requestMetrics.clear();
    Object.keys(this.aggregatedMetrics).forEach(key => {
      if (typeof this.aggregatedMetrics[key] === 'number') {
        this.aggregatedMetrics[key] = 0;
      } else if (this.aggregatedMetrics[key] instanceof Map) {
        this.aggregatedMetrics[key].clear();
      }
    });
    
    Object.keys(this.timeSeriesMetrics).forEach(key => {
      this.timeSeriesMetrics[key].length = 0;
    });
    
    this.logger.debug('Metrics cleared');
  }

  private addToTimeSeries(series: MetricData[], value: number, tags?: Record<string, string>): void {
    series.push({
      timestamp: new Date(),
      value,
      tags,
    });

    // Maintain max length
    if (series.length > this.maxTimeSeriesLength) {
      series.splice(0, series.length - this.maxTimeSeriesLength);
    }
  }

  private incrementMapCount<K>(map: Map<K, number>, key: K): void {
    map.set(key, (map.get(key) || 0) + 1);
  }

  private getTopEntries<K>(map: Map<K, number>, limit: number): Array<{ key: K; count: number }> {
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private getActiveRequestCount(): number {
    return Array.from(this.requestMetrics.values())
      .filter(req => !req.endTime).length;
  }

  private getRequestsInTimeRange(timeRangeMs: number): number {
    const cutoff = new Date(Date.now() - timeRangeMs);
    return Array.from(this.requestMetrics.values())
      .filter(req => req.startTime > cutoff).length;
  }

  private updateCacheHitRatio(): void {
    const total = this.aggregatedMetrics.cacheHits + this.aggregatedMetrics.cacheMisses;
    const ratio = total > 0 ? (this.aggregatedMetrics.cacheHits / total) * 100 : 0;
    
    this.addToTimeSeries(this.timeSeriesMetrics.cacheHitRatio, ratio);
  }

  private aggregateTimeSeriesByMinute(series: MetricData[]): Array<{ timestamp: string; value: number; count: number }> {
    const minuteGroups = new Map<string, { sum: number; count: number }>();
    
    series.forEach(data => {
      const minute = new Date(data.timestamp);
      minute.setSeconds(0, 0);
      const key = minute.toISOString();
      
      const existing = minuteGroups.get(key) || { sum: 0, count: 0 };
      existing.sum += data.value;
      existing.count += 1;
      minuteGroups.set(key, existing);
    });
    
    return Array.from(minuteGroups.entries())
      .map(([timestamp, { sum, count }]) => ({
        timestamp,
        value: sum / count, // Average for the minute
        count,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-60); // Last hour
  }

  private getMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  }

  private getPercentile(numbers: number[], percentile: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (Math.floor(index) === index) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }
}