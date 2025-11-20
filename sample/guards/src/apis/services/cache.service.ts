import { Injectable, Logger } from '@nestjs/common';
import { CacheInterceptor } from '../../interceptors/cache.interceptor';

/**
 * Example service that uses CacheInterceptor for manual cache management
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    private readonly cacheInterceptor: CacheInterceptor
  ) {}

  /**
   * Manually invalidate cache for a specific pattern
   */
  async invalidateCache(pattern?: string): Promise<void> {
    this.logger.log(`Invalidating cache ${pattern ? `for pattern: ${pattern}` : 'completely'}`);
    this.cacheInterceptor.invalidateCache(pattern);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return this.cacheInterceptor.getCacheStats();
  }

  /**
   * Clear all cache entries
   */
  async clearAllCache(): Promise<void> {
    this.logger.log('Clearing all cache entries');
    this.cacheInterceptor.invalidateCache();
  }

  /**
   * Invalidate cache for specific routes
   */
  async invalidateRouteCache(routes: string[]): Promise<void> {
    this.logger.log(`Invalidating cache for routes: ${routes.join(', ')}`);
    
    for (const route of routes) {
      this.cacheInterceptor.invalidateCache(route);
    }
  }

  /**
   * Get detailed cache information for monitoring
   */
  async getCacheHealth(): Promise<{
    status: string;
    stats: any;
    recommendations: string[];
  }> {
    const stats = this.getCacheStats();
    const recommendations: string[] = [];
    
    // Add cache health recommendations based on stats
    if (stats.size > 1000) {
      recommendations.push('Consider reducing cache TTL or implementing cache size limits');
    }
    
    if (stats.hitRate < 0.7) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }

    return {
      status: 'healthy',
      stats,
      recommendations,
    };
  }
}