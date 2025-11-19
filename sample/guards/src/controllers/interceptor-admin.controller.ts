import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { SecureEndpoint } from '../security/decorators/secure.decorator';
import { AccessLevel } from '../enums/access-level.enum';
import { CacheService } from '../services/cache.service';
import { InterceptorManagementService } from '../services/interceptor-management.service';
import { 
  CacheInvalidationDto, 
  RouteInvalidationDto, 
  InterceptorConfigDto,
  SystemHealthResponseDto,
  PerformanceReportResponseDto,
  CacheStatsResponseDto,
  OperationResponseDto,
  ConfigUpdateResponseDto
} from './dto/admin.dto';

/**
 * Admin controller for managing interceptors and cache
 */
@ApiTags('Admin - Interceptor Management')
@ApiBearerAuth()
@Controller('admin/interceptors')
@SecureEndpoint(AccessLevel.ADMIN) // Require admin access for all endpoints
export class InterceptorAdminController {
  
  constructor(
    private readonly cacheService: CacheService,
    private readonly interceptorManagementService: InterceptorManagementService,
  ) {}

  /**
   * Get comprehensive system health
   */
  @ApiOperation({ 
    summary: 'Get comprehensive system health',
    description: 'Retrieve detailed system health including interceptors, cache, performance metrics, and overall system status. Admin access required.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'System health retrieved successfully',
    type: SystemHealthResponseDto
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - missing or invalid bearer token'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - admin access required'
  })
  @Get('health')
  async getSystemHealth() {
    return {
      success: true,
      data: await this.interceptorManagementService.getSystemHealth(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get performance report
   */
  @ApiOperation({ 
    summary: 'Get performance report',
    description: 'Retrieve detailed performance metrics including response times, throughput, error rates, and resource usage.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance report retrieved successfully',
    type: PerformanceReportResponseDto
  })
  @Get('performance')
  async getPerformanceReport() {
    return {
      success: true,
      data: await this.interceptorManagementService.getPerformanceReport(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get cache statistics
   */
  @ApiOperation({ 
    summary: 'Get cache statistics',
    description: 'Retrieve comprehensive cache statistics including hit rates, memory usage, and cache health metrics.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache statistics retrieved successfully',
    type: CacheStatsResponseDto
  })
  @Get('cache/stats')
  async getCacheStats() {
    return {
      success: true,
      data: {
        stats: this.cacheService.getCacheStats(),
        health: await this.cacheService.getCacheHealth(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear all caches
   */
  @ApiOperation({ 
    summary: 'Clear all caches',
    description: 'Clear all cache entries across the entire system. Use with caution as this will impact performance until caches are rebuilt.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'All caches cleared successfully',
    type: OperationResponseDto
  })
  @Delete('cache')
  async clearAllCache() {
    await this.cacheService.clearAllCache();
    return {
      success: true,
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Invalidate specific cache pattern
   */
  @ApiOperation({ 
    summary: 'Invalidate cache by pattern',
    description: 'Invalidate cache entries matching a specific pattern. If no pattern is provided, all caches will be invalidated.' 
  })
  @ApiBody({
    type: CacheInvalidationDto,
    examples: {
      withPattern: {
        summary: 'Invalidate with pattern',
        value: { pattern: 'user:*' }
      },
      withoutPattern: {
        summary: 'Invalidate all',
        value: {}
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Cache invalidated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cache invalidated for pattern: user:*' },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @Post('cache/invalidate')
  async invalidateCache(@Body() body: CacheInvalidationDto) {
    await this.cacheService.invalidateCache(body.pattern);
    return {
      success: true,
      message: `Cache invalidated ${body.pattern ? `for pattern: ${body.pattern}` : 'completely'}`,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Invalidate cache for specific routes
   */
  @ApiOperation({ 
    summary: 'Invalidate cache for specific routes',
    description: 'Invalidate cache entries for specific route paths. Useful for targeted cache clearing after updates.' 
  })
  @ApiBody({
    type: RouteInvalidationDto,
    examples: {
      multipleRoutes: {
        summary: 'Multiple routes',
        value: { routes: ['/api/catalog', '/api/users', '/api/products'] }
      },
      singleRoute: {
        summary: 'Single route',
        value: { routes: ['/api/catalog/search'] }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Route cache invalidated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Cache invalidated for 3 routes' },
        routes: { type: 'array', example: ['/api/catalog', '/api/users'] },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @Post('cache/invalidate-routes')
  async invalidateRouteCache(@Body() body: RouteInvalidationDto) {
    await this.cacheService.invalidateRouteCache(body.routes);
    return {
      success: true,
      message: `Cache invalidated for ${body.routes.length} routes`,
      routes: body.routes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset all metrics and caches
   */
  @ApiOperation({ 
    summary: 'Reset all metrics and caches',
    description: 'Reset all performance metrics, clear all caches, and reinitialize system counters. This is a comprehensive system reset.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'All metrics and caches reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'All metrics and caches reset successfully' },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @Post('reset')
  async resetAllMetrics() {
    await this.interceptorManagementService.resetAllMetrics();
    return {
      success: true,
      message: 'All metrics and caches reset successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Update interceptor configuration
   */
  @ApiOperation({ 
    summary: 'Update interceptor configuration',
    description: 'Update runtime configuration for interceptors including cache settings, performance thresholds, and monitoring parameters.' 
  })
  @ApiBody({
    type: InterceptorConfigDto,
    examples: {
      fullConfig: {
        summary: 'Complete configuration',
        value: {
          cache: { ttl: 3600, maxSize: 1000 },
          performance: { slowQueryThreshold: 1000, enableMetrics: true },
          rateLimit: { windowMs: 60000, max: 100 }
        }
      },
      cacheOnly: {
        summary: 'Cache configuration only',
        value: {
          cache: { ttl: 7200, maxSize: 2000 }
        }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Configuration updated successfully',
    type: ConfigUpdateResponseDto
  })
  @Post('configure')
  async updateConfiguration(@Body() config: any) {
    await this.interceptorManagementService.updateConfiguration(config);
    return {
      success: true,
      message: 'Configuration updated successfully',
      config,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get cache health with detailed recommendations
   */
  @ApiOperation({ 
    summary: 'Get detailed cache health',
    description: 'Get comprehensive cache health status with performance recommendations and optimization suggestions.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cache health retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { 
          type: 'object',
          properties: {
            status: { type: 'string', example: 'healthy' },
            memoryUsage: { type: 'number', example: 75.5 },
            recommendations: { 
              type: 'array', 
              example: ['Consider increasing cache size', 'Optimize TTL settings']
            },
            alerts: { type: 'array', example: [] }
          }
        },
        timestamp: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
      }
    }
  })
  @Get('cache/health')
  async getCacheHealth() {
    return {
      success: true,
      data: await this.cacheService.getCacheHealth(),
      timestamp: new Date().toISOString(),
    };
  }
}