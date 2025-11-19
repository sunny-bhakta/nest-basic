import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CacheInvalidationDto {
  @ApiProperty({
    description: 'Cache key pattern to invalidate (optional)',
    example: 'user:*',
    required: false,
  })
  @IsOptional()
  @IsString()
  pattern?: string;
}

export class RouteInvalidationDto {
  @ApiProperty({
    description: 'Array of route paths to invalidate',
    example: ['/api/catalog', '/api/users'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  routes: string[];
}

export class CacheConfigDto {
  @ApiProperty({
    description: 'Time to live in seconds',
    example: 3600,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  ttl?: number;

  @ApiProperty({
    description: 'Maximum cache size',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  maxSize?: number;
}

export class PerformanceConfigDto {
  @ApiProperty({
    description: 'Slow query threshold in milliseconds',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  slowQueryThreshold?: number;

  @ApiProperty({
    description: 'Enable performance metrics collection',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enableMetrics?: boolean;
}

export class RateLimitConfigDto {
  @ApiProperty({
    description: 'Rate limit window in milliseconds',
    example: 60000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  windowMs?: number;

  @ApiProperty({
    description: 'Maximum requests per window',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  max?: number;
}

export class InterceptorConfigDto {
  @ApiProperty({
    description: 'Cache configuration',
    type: CacheConfigDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CacheConfigDto)
  cache?: CacheConfigDto;

  @ApiProperty({
    description: 'Performance configuration',
    type: PerformanceConfigDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PerformanceConfigDto)
  performance?: PerformanceConfigDto;

  @ApiProperty({
    description: 'Rate limit configuration',
    type: RateLimitConfigDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RateLimitConfigDto)
  rateLimit?: RateLimitConfigDto;
}

export class SystemHealthResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'System health data',
    example: {
      interceptors: { active: 5, errors: 0 },
      cache: { hitRate: 0.95, size: 1024 },
      performance: { avgResponseTime: 125 }
    },
  })
  data: any;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: string;
}

export class PerformanceReportResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Performance metrics',
    example: {
      avgResponseTime: 125,
      requestsPerSecond: 45,
      errorRate: 0.02,
      slowQueries: []
    },
  })
  data: any;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: string;
}

export class CacheStatsResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Cache statistics and health',
    example: {
      stats: {
        hits: 1250,
        misses: 150,
        hitRate: 0.893,
        size: 2048
      },
      health: {
        status: 'healthy',
        memoryUsage: 75.5
      }
    },
  })
  data: any;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: string;
}

export class OperationResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Operation result message',
    example: 'All caches cleared successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: string;
}

export class ConfigUpdateResponseDto extends OperationResponseDto {
  @ApiProperty({
    description: 'Updated configuration',
    example: {
      cache: { ttl: 3600, maxSize: 1000 }
    },
  })
  config: any;
}