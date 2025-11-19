# How to Inject CacheInterceptor in Service Files

## Problem Solved ✅
The original issue was that `CacheInterceptor` was registered both as a class provider AND as a factory provider, causing NestJS dependency injection conflicts.

## Solution Summary

### 1. Fixed Interceptor Registration
Updated `interceptors.module.ts` to avoid duplicate registrations:

```typescript
@Module({
  providers: [
    // Individual interceptor instances (for injection in services)
    LoggingInterceptor,
    ResponseTransformInterceptor,
    SecurityInterceptor,
    CorsInterceptor,
    PerformanceInterceptor,
    
    // Factory providers for interceptors with configuration
    {
      provide: CacheInterceptor,
      useFactory: () => new CacheInterceptor({
        ttl: 300, // 5 minutes default TTL
        keyGenerator: (req) => `${req.method}-${req.url}`,
        excludeRoutes: ['/auth/', '/admin/'],
      }),
    },
    
    // Global interceptors using existing instances
    {
      provide: APP_INTERCEPTOR,
      useExisting: CacheInterceptor, // ✅ Use existing instance
    },
  ],
})
```

### 2. How to Inject CacheInterceptor in Services

#### Basic Injection Example:
```typescript
@Injectable()
export class CacheService {
  constructor(
    private readonly cacheInterceptor: CacheInterceptor
  ) {}

  async invalidateCache(pattern?: string): Promise<void> {
    this.cacheInterceptor.invalidateCache(pattern);
  }

  getCacheStats(): any {
    return this.cacheInterceptor.getCacheStats();
  }
}
```

#### Advanced Service Example:
```typescript
@Injectable()
export class DataService {
  constructor(
    private readonly cacheInterceptor: CacheInterceptor
  ) {}

  async updateUserData(userId: string, updateData: any): Promise<any> {
    // Update data
    const result = await this.performUpdate(userId, updateData);
    
    // Invalidate related cache
    this.cacheInterceptor.invalidateCache(`/users/${userId}`);
    
    return result;
  }
}
```

#### Multiple Interceptors Injection:
```typescript
@Injectable()
export class InterceptorManagementService {
  constructor(
    private readonly cacheInterceptor: CacheInterceptor,
    private readonly rateLimitInterceptor: RateLimitInterceptor,
    private readonly timeoutInterceptor: TimeoutInterceptor,
    private readonly performanceInterceptor: PerformanceInterceptor,
  ) {}

  async getSystemHealth(): Promise<any> {
    return {
      cache: this.cacheInterceptor.getCacheStats(),
      performance: this.performanceInterceptor.getPerformanceStats(),
      rateLimit: { status: 'active' },
    };
  }
}
```

### 3. Module Setup

#### Services Module:
```typescript
@Module({
  imports: [
    InterceptorsModule, // ✅ Import to get access to interceptor instances
  ],
  providers: [
    CacheService,
    DataService,
    InterceptorManagementService,
  ],
  exports: [
    CacheService,
    DataService,
    InterceptorManagementService,
  ],
})
export class ServicesModule {}
```

#### App Module Integration:
```typescript
@Module({
  imports: [
    InterceptorsModule,  // Global interceptors
    ServicesModule,      // Business services
    ControllersModule,   // Controllers that use services
  ],
})
export class AppModule {}
```

### 4. Usage Examples

#### In Controllers:
```typescript
@Controller('admin/cache')
@SecureEndpoint(AccessLevel.ADMIN)
export class CacheAdminController {
  constructor(
    private readonly cacheService: CacheService
  ) {}

  @Delete('clear')
  async clearCache() {
    await this.cacheService.clearAllCache();
    return { success: true, message: 'Cache cleared' };
  }

  @Get('stats')
  async getCacheStats() {
    return {
      success: true,
      data: this.cacheService.getCacheStats()
    };
  }
}
```

#### Manual Cache Management:
```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly cacheInterceptor: CacheInterceptor
  ) {}

  async updateUser(userId: string, data: any) {
    // Perform update
    const result = await this.repository.update(userId, data);
    
    // Invalidate related cache entries
    await this.invalidateUserCaches(userId);
    
    return result;
  }

  private async invalidateUserCaches(userId: string) {
    const patterns = [
      `/api/users/${userId}`,
      `/api/profile/${userId}`,
      `/api/user-details/${userId}`,
    ];
    
    patterns.forEach(pattern => {
      this.cacheInterceptor.invalidateCache(pattern);
    });
  }
}
```

### 5. Available Methods

#### CacheInterceptor Methods:
- `getCacheStats()` - Get cache statistics
- `invalidateCache(pattern?: string)` - Clear cache entries
- `intercept()` - Automatic caching (used by NestJS)

#### PerformanceInterceptor Methods:
- `getPerformanceStats()` - Get performance metrics
- `clearMetrics()` - Clear stored metrics
- `getSlowestEndpoints(limit?)` - Get slowest endpoints

#### RateLimitInterceptor Methods:
- `cleanup()` - Clean expired rate limit entries
- `intercept()` - Rate limiting logic (used by NestJS)

### 6. Key Benefits

✅ **Dependency Injection Works** - No more "UnknownDependenciesException"
✅ **Flexible Cache Management** - Manual cache control in services
✅ **Performance Monitoring** - Access to metrics in business logic
✅ **Admin Capabilities** - Full system management via services
✅ **Type Safety** - Proper TypeScript support

### 7. Testing

```typescript
describe('CacheService', () => {
  let service: CacheService;
  let cacheInterceptor: CacheInterceptor;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CacheInterceptor,
          useValue: {
            getCacheStats: jest.fn(),
            invalidateCache: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheInterceptor = module.get<CacheInterceptor>(CacheInterceptor);
  });

  it('should clear cache', async () => {
    await service.clearAllCache();
    expect(cacheInterceptor.invalidateCache).toHaveBeenCalled();
  });
});
```

## Files Created

1. **`src/services/cache.service.ts`** - Basic cache management service
2. **`src/services/data.service.ts`** - Example service with cache invalidation
3. **`src/services/interceptor-management.service.ts`** - Complete interceptor management
4. **`src/services/services.module.ts`** - Services module configuration
5. **`src/controllers/interceptor-admin.controller.ts`** - Admin controller example
6. **`src/controllers/controllers.module.ts`** - Controllers module

The dependency injection issue is now resolved and you can inject `CacheInterceptor` and other interceptors into any service! 🎉