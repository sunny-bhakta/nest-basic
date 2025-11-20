import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, timeout, finalize } from 'rxjs/operators';
import { Request, Response } from 'express';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  userAgent?: string;
  ip?: string;
}

/**
 * Performance monitoring interceptor that tracks request metrics
 * Provides detailed performance analytics and alerts for slow operations
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private readonly slowRequestThreshold = 1000; // milliseconds
  private readonly verySlowRequestThreshold = 5000; // milliseconds

  private options: {
    enableMetricsCollection?: boolean;
    enableSlowRequestLogging?: boolean;
    enableMemoryMonitoring?: boolean;
    enableCpuMonitoring?: boolean;
    timeoutMs?: number;
    alertThresholds?: {
      slow?: number;
      verySlow?: number;
      memory?: number; // MB
    };
  } = {
    enableMetricsCollection: true,
    enableSlowRequestLogging: true,
    enableMemoryMonitoring: true,
    enableCpuMonitoring: true,
    timeoutMs: 30000,
    alertThresholds: {
      slow: 1000,
      verySlow: 5000,
      memory: 100,
    },
  };

  // Method to configure options after instantiation
  configure(options: Partial<typeof this.options>): void {
    this.options = { ...this.options, ...options };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    
    const requestId = request['requestId'] || 'unknown';
    const startTime = Date.now();
    const startCpuUsage = this.options.enableCpuMonitoring !== false ? process.cpuUsage() : undefined;
    
    // Set timeout if specified
    let observable = next.handle();
    if (this.options.timeoutMs) {
      observable = observable.pipe(timeout(this.options.timeoutMs));
    }

    return observable.pipe(
      tap(() => {
        // Log successful completion if enabled
        if (this.options.enableSlowRequestLogging !== false) {
          const duration = Date.now() - startTime;
          if (duration > (this.options.alertThresholds?.slow || this.slowRequestThreshold)) {
            this.logger.warn(
              `SLOW REQUEST [${requestId}] ${request.method} ${request.url} - Duration: ${duration}ms`
            );
          }
        }
      }),
      finalize(() => {
        this.recordMetrics(request, response, requestId, startTime, startCpuUsage);
      })
    );
  }

  private recordMetrics(
    request: Request,
    response: Response,
    requestId: string,
    startTime: number,
    startCpuUsage?: NodeJS.CpuUsage
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const memoryUsage = process.memoryUsage();
    
    let cpuUsage: NodeJS.CpuUsage | undefined;
    if (startCpuUsage && this.options.enableCpuMonitoring !== false) {
      cpuUsage = process.cpuUsage(startCpuUsage);
    }

    const metrics: PerformanceMetrics = {
      requestId,
      method: request.method,
      url: request.url,
      statusCode: response.statusCode,
      startTime,
      endTime,
      duration,
      memoryUsage,
      cpuUsage,
      userAgent: request.get('User-Agent'),
      ip: request.ip,
    };

    // Store metrics if enabled
    if (this.options.enableMetricsCollection !== false) {
      this.storeMetrics(metrics);
    }

    // Log performance alerts
    this.checkPerformanceAlerts(metrics);

    // Log detailed metrics for debugging
    this.logDetailedMetrics(metrics);
  }

  private storeMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Maintain max history size
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsHistory);
    }
  }

  private checkPerformanceAlerts(metrics: PerformanceMetrics): void {
    const { duration, memoryUsage } = metrics;
    const slowThreshold = this.options.alertThresholds?.slow || this.slowRequestThreshold;
    const verySlowThreshold = this.options.alertThresholds?.verySlow || this.verySlowRequestThreshold;
    const memoryThresholdMB = this.options.alertThresholds?.memory || 100;

    // Check response time alerts
    if (duration > verySlowThreshold) {
      this.logger.error(
        `VERY SLOW REQUEST [${metrics.requestId}] ${metrics.method} ${metrics.url} - ` +
        `Duration: ${duration}ms (threshold: ${verySlowThreshold}ms)`
      );
    } else if (duration > slowThreshold) {
      this.logger.warn(
        `SLOW REQUEST [${metrics.requestId}] ${metrics.method} ${metrics.url} - ` +
        `Duration: ${duration}ms (threshold: ${slowThreshold}ms)`
      );
    }

    // Check memory usage alerts
    const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsedMB > memoryThresholdMB) {
      this.logger.warn(
        `HIGH MEMORY USAGE [${metrics.requestId}] Memory: ${memoryUsedMB.toFixed(2)}MB ` +
        `(threshold: ${memoryThresholdMB}MB)`
      );
    }

    // Check for error responses
    if (metrics.statusCode >= 500) {
      this.logger.error(
        `SERVER ERROR [${metrics.requestId}] ${metrics.method} ${metrics.url} - ` +
        `Status: ${metrics.statusCode} - Duration: ${duration}ms`
      );
    } else if (metrics.statusCode >= 400) {
      this.logger.warn(
        `CLIENT ERROR [${metrics.requestId}] ${metrics.method} ${metrics.url} - ` +
        `Status: ${metrics.statusCode} - Duration: ${duration}ms`
      );
    }
  }

  private logDetailedMetrics(metrics: PerformanceMetrics): void {
    const { requestId, method, url, duration, memoryUsage, cpuUsage, statusCode } = metrics;
    
    let logMessage = `PERFORMANCE [${requestId}] ${method} ${url} - ` +
      `Duration: ${duration}ms - Status: ${statusCode}`;

    if (this.options.enableMemoryMonitoring !== false) {
      const heapUsedMB = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
      const heapTotalMB = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
      logMessage += ` - Memory: ${heapUsedMB}/${heapTotalMB}MB`;
    }

    if (cpuUsage && this.options.enableCpuMonitoring !== false) {
      const cpuUserMs = (cpuUsage.user / 1000).toFixed(2);
      const cpuSystemMs = (cpuUsage.system / 1000).toFixed(2);
      logMessage += ` - CPU: ${cpuUserMs}ms user, ${cpuSystemMs}ms system`;
    }

    // Use appropriate log level based on performance
    if (duration > this.verySlowRequestThreshold) {
      this.logger.error(logMessage);
    } else if (duration > this.slowRequestThreshold) {
      this.logger.warn(logMessage);
    } else {
      this.logger.debug(logMessage);
    }
  }

  /**
   * Get performance statistics for monitoring dashboard
   */
  getPerformanceStats(): any {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        memoryStats: process.memoryUsage(),
      };
    }

    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes
    const totalRequests = recentMetrics.length;
    
    if (totalRequests === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        errorRate: 0,
        memoryStats: process.memoryUsage(),
      };
    }

    const durations = recentMetrics.map(m => m.duration);
    const averageResponseTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const slowRequests = recentMetrics.filter(m => m.duration > this.slowRequestThreshold).length;
    const errorRequests = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorRequests / totalRequests) * 100;

    const p50 = this.getPercentile(durations, 50);
    const p95 = this.getPercentile(durations, 95);
    const p99 = this.getPercentile(durations, 99);

    const statusCodeCounts = recentMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const endpointStats = recentMetrics.reduce((acc, m) => {
      const key = `${m.method} ${m.url}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalDuration: 0, errors: 0 };
      }
      acc[key].count++;
      acc[key].totalDuration += m.duration;
      if (m.statusCode >= 400) acc[key].errors++;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; errors: number }>);

    // Calculate average duration for each endpoint
    Object.keys(endpointStats).forEach(key => {
      endpointStats[key] = {
        ...endpointStats[key],
        averageDuration: endpointStats[key].totalDuration / endpointStats[key].count,
        errorRate: (endpointStats[key].errors / endpointStats[key].count) * 100,
      } as any;
    });

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      slowRequests,
      errorRate: Math.round(errorRate * 100) / 100,
      percentiles: { p50: Math.round(p50), p95: Math.round(p95), p99: Math.round(p99) },
      statusCodeCounts,
      endpointStats,
      memoryStats: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Get metrics from the last N milliseconds
   */
  private getRecentMetrics(timeWindowMs: number): PerformanceMetrics[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.metrics.filter(m => m.endTime > cutoff);
  }

  /**
   * Calculate percentile from array of numbers
   */
  private getPercentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    
    if (Number.isInteger(index)) {
      return sorted[index];
    } else {
      const lower = sorted[Math.floor(index)];
      const upper = sorted[Math.ceil(index)];
      return lower + (upper - lower) * (index - Math.floor(index));
    }
  }

  /**
   * Get slowest endpoints in the recent time window
   */
  getSlowestEndpoints(limit = 10, timeWindowMs = 300000): any[] {
    const recentMetrics = this.getRecentMetrics(timeWindowMs);
    const endpointStats = recentMetrics.reduce((acc, m) => {
      const key = `${m.method} ${m.url}`;
      if (!acc[key]) {
        acc[key] = { 
          endpoint: key, 
          count: 0, 
          totalDuration: 0, 
          maxDuration: 0,
          minDuration: Infinity,
        };
      }
      acc[key].count++;
      acc[key].totalDuration += m.duration;
      acc[key].maxDuration = Math.max(acc[key].maxDuration, m.duration);
      acc[key].minDuration = Math.min(acc[key].minDuration, m.duration);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(endpointStats)
      .map((stats: any) => ({
        ...stats,
        averageDuration: stats.totalDuration / stats.count,
        minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, limit);
  }

  /**
   * Clear stored metrics (useful for testing or memory management)
   */
  clearMetrics(): void {
    this.metrics.length = 0;
    this.logger.debug('Performance metrics cleared');
  }
}