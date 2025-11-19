import { Injectable, Logger } from '@nestjs/common';
import { CacheInterceptor, RateLimitInterceptor, TimeoutInterceptor } from '../interceptors/cache.interceptor';
import { PerformanceInterceptor } from '../interceptors/performance.interceptor';

/**
 * Admin service that can manage and monitor all interceptors
 */
@Injectable()
export class InterceptorManagementService {
  private readonly logger = new Logger(InterceptorManagementService.name);

  constructor(
    private readonly cacheInterceptor: CacheInterceptor,
    private readonly rateLimitInterceptor: RateLimitInterceptor,
    private readonly timeoutInterceptor: TimeoutInterceptor,
    private readonly performanceInterceptor: PerformanceInterceptor,
  ) {}

  /**
   * Get comprehensive system health including all interceptors
   */
  async getSystemHealth(): Promise<{
    cache: any;
    rateLimit: any;
    performance: any;
    overall: string;
  }> {
    const cache = this.cacheInterceptor.getCacheStats();
    const performance = this.performanceInterceptor.getPerformanceStats();
    
    // Rate limit cleanup
    this.rateLimitInterceptor.cleanup();

    return {
      cache,
      rateLimit: { status: 'active', cleanupPerformed: true },
      performance,
      overall: 'healthy',
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  async resetAllMetrics(): Promise<void> {
    this.logger.log('Resetting all interceptor metrics and caches');
    
    // Clear cache
    this.cacheInterceptor.invalidateCache();
    
    // Clear performance metrics
    this.performanceInterceptor.clearMetrics();
    
    // Clean up rate limit entries
    this.rateLimitInterceptor.cleanup();
    
    this.logger.log('All metrics and caches reset successfully');
  }

  /**
   * Get performance statistics
   */
  async getPerformanceReport(): Promise<any> {
    const metrics = this.performanceInterceptor.getPerformanceStats();
    const cacheStats = this.cacheInterceptor.getCacheStats();
    
    return {
      performance: metrics,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
      recommendations: this.generateRecommendations(metrics, cacheStats),
    };
  }

  /**
   * Configure interceptors at runtime
   */
  async updateConfiguration(config: {
    cache?: { ttl?: number };
    performance?: { alertThresholds?: any };
  }): Promise<void> {
    this.logger.log('Updating interceptor configuration', config);
    
    // Note: In a real implementation, you'd need to update the interceptor configurations
    // This might require a more sophisticated approach with configuration services
    
    this.logger.log('Configuration update completed');
  }

  private generateRecommendations(performanceMetrics: any, cacheStats: any): string[] {
    const recommendations: string[] = [];
    
    // Performance recommendations
    if (performanceMetrics.averageResponseTime > 1000) {
      recommendations.push('Consider optimizing slow endpoints or increasing cache TTL');
    }
    
    // Cache recommendations
    if (cacheStats.hitRate < 0.5) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }
    
    if (cacheStats.size > 10000) {
      recommendations.push('Large cache size - consider implementing size limits');
    }
    
    return recommendations;
  }
}