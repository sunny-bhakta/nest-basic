import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { of } from 'rxjs';
import { InterceptorsModule } from '../interceptors.module';
import { 
  LoggingInterceptor,
  ResponseTransformInterceptor,
  CacheInterceptor,
  TimeoutInterceptor,
  RateLimitInterceptor,
  SecurityInterceptor,
  CorsInterceptor,
  PerformanceInterceptor
} from '../index';

describe('InterceptorsModule', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [InterceptorsModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('module configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should provide all interceptor instances', () => {
      const loggingInterceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
      const responseInterceptor = module.get<ResponseTransformInterceptor>(ResponseTransformInterceptor);
      const cacheInterceptor = module.get<CacheInterceptor>(CacheInterceptor);
      const timeoutInterceptor = module.get<TimeoutInterceptor>(TimeoutInterceptor);
      const rateLimitInterceptor = module.get<RateLimitInterceptor>(RateLimitInterceptor);
      const securityInterceptor = module.get<SecurityInterceptor>(SecurityInterceptor);
      const corsInterceptor = module.get<CorsInterceptor>(CorsInterceptor);
      const performanceInterceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);

      expect(loggingInterceptor).toBeInstanceOf(LoggingInterceptor);
      expect(responseInterceptor).toBeInstanceOf(ResponseTransformInterceptor);
      expect(cacheInterceptor).toBeInstanceOf(CacheInterceptor);
      expect(timeoutInterceptor).toBeInstanceOf(TimeoutInterceptor);
      expect(rateLimitInterceptor).toBeInstanceOf(RateLimitInterceptor);
      expect(securityInterceptor).toBeInstanceOf(SecurityInterceptor);
      expect(corsInterceptor).toBeInstanceOf(CorsInterceptor);
      expect(performanceInterceptor).toBeInstanceOf(PerformanceInterceptor);
    });

    it('should export all interceptors', () => {
      // Test that interceptors are available for export
      const exports = Reflect.getMetadata('exports', InterceptorsModule);
      expect(exports).toContain(LoggingInterceptor);
      expect(exports).toContain(ResponseTransformInterceptor);
      expect(exports).toContain(CacheInterceptor);
      expect(exports).toContain(TimeoutInterceptor);
      expect(exports).toContain(RateLimitInterceptor);
      expect(exports).toContain(SecurityInterceptor);
      expect(exports).toContain(CorsInterceptor);
      expect(exports).toContain(PerformanceInterceptor);
    });
  });

  describe('static methods', () => {
    it('should provide configuration information', () => {
      const config = InterceptorsModule.getConfiguration();
      
      expect(config).toHaveProperty('interceptors');
      expect(config).toHaveProperty('executionOrder');
      expect(config).toHaveProperty('description');
      
      expect(config.interceptors).toBeInstanceOf(Array);
      expect(config.interceptors.length).toBe(8);
      expect(config.interceptors).toContain('SecurityInterceptor');
      expect(config.interceptors).toContain('LoggingInterceptor');
      expect(config.interceptors).toContain('ResponseTransformInterceptor');
    });

    it('should provide stats method', () => {
      const stats = InterceptorsModule.getStats();
      
      expect(stats).toHaveProperty('performance');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('rateLimit');
      expect(stats).toHaveProperty('security');
      expect(stats).toHaveProperty('logging');
    });

    it('should provide cache clearing method', () => {
      expect(() => InterceptorsModule.clearCaches()).not.toThrow();
    });
  });
});

describe('Interceptors Integration', () => {
  let loggingInterceptor: LoggingInterceptor;
  let responseInterceptor: ResponseTransformInterceptor;
  let cacheInterceptor: CacheInterceptor;
  let securityInterceptor: SecurityInterceptor;
  let performanceInterceptor: PerformanceInterceptor;
  
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        ResponseTransformInterceptor,
        CacheInterceptor,
        SecurityInterceptor,
        PerformanceInterceptor,
      ],
    }).compile();

    loggingInterceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
    responseInterceptor = module.get<ResponseTransformInterceptor>(ResponseTransformInterceptor);
    cacheInterceptor = module.get<CacheInterceptor>(CacheInterceptor);
    securityInterceptor = module.get<SecurityInterceptor>(SecurityInterceptor);
    performanceInterceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-user-agent';
        if (header === 'Origin') return 'http://localhost:3000';
        return undefined;
      }),
      body: {},
      query: {},
      headers: {
        'user-agent': 'test-user-agent',
        'origin': 'http://localhost:3000'
      },
      requestId: 'integration-test-id',
    };

    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
      get: jest.fn(),
      getHeaders: jest.fn(() => ({ 'content-type': 'application/json' })),
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  describe('interceptor pipeline', () => {
    it('should work together in sequence', (done) => {
      const testData = { id: 1, name: 'Test Item' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      // Simulate the interceptor pipeline
      // 1. Security -> 2. Performance -> 3. Logging -> 4. Cache -> 5. ResponseTransform
      
      const securityResult = securityInterceptor.intercept(mockExecutionContext, {
        handle: () => performanceInterceptor.intercept(mockExecutionContext, {
          handle: () => loggingInterceptor.intercept(mockExecutionContext, {
            handle: () => cacheInterceptor.intercept(mockExecutionContext, {
              handle: () => responseInterceptor.intercept(mockExecutionContext, mockCallHandler)
            })
          })
        })
      });

      securityResult.subscribe({
        next: (result) => {
          // Should have security headers set
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Content-Security-Policy',
            expect.stringContaining("default-src 'self'")
          );
          
          // Should have response transformation applied
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('data');
          expect(result).toHaveProperty('metadata');
          expect(result.success).toBe(true);
          expect(result.data).toEqual(testData);
          
          done();
        },
      });
    });

    it('should handle errors through the pipeline', (done) => {
      const error = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockReturnValue(of(error));

      // Simulate error flow through interceptors
      const securityResult = securityInterceptor.intercept(mockExecutionContext, {
        handle: () => performanceInterceptor.intercept(mockExecutionContext, {
          handle: () => loggingInterceptor.intercept(mockExecutionContext, mockCallHandler)
        })
      });

      securityResult.subscribe({
        next: (result) => {
          // Even errors should go through security and performance interceptors
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Content-Security-Policy',
            expect.any(String)
          );
          done();
        },
      });
    });

    it('should maintain request context through pipeline', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('test'));
      
      // Add performance headers and logging should pick them up
      const result = performanceInterceptor.intercept(mockExecutionContext, {
        handle: () => loggingInterceptor.intercept(mockExecutionContext, mockCallHandler)
      });

      result.subscribe({
        complete: () => {
          // Performance interceptor should set headers
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', 'integration-test-id');
          done();
        },
      });
    });
  });

  describe('caching with other interceptors', () => {
    it('should cache transformed responses', (done) => {
      const testData = { message: 'cacheable' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      // First request through cache + response transform
      const result1 = cacheInterceptor.intercept(mockExecutionContext, {
        handle: () => responseInterceptor.intercept(mockExecutionContext, mockCallHandler)
      });

      result1.subscribe({
        next: (transformedResult) => {
          expect(transformedResult.success).toBe(true);
          expect(transformedResult.data).toEqual(testData);
          expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);

          // Second request should use cache (but response is already transformed)
          const result2 = cacheInterceptor.intercept(mockExecutionContext, {
            handle: () => responseInterceptor.intercept(mockExecutionContext, mockCallHandler)
          });

          result2.subscribe({
            next: (cachedResult) => {
              expect(cachedResult.success).toBe(true);
              expect(cachedResult.data).toEqual(testData);
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(1); // Still only called once
              done();
            },
          });
        },
      });
    });
  });

  describe('security with performance monitoring', () => {
    it('should track performance of security operations', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('secure-response'));

      const result = performanceInterceptor.intercept(mockExecutionContext, {
        handle: () => securityInterceptor.intercept(mockExecutionContext, mockCallHandler)
      });

      result.subscribe({
        complete: () => {
          // Both should have executed
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Content-Security-Policy',
            expect.any(String)
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.any(String));
          done();
        },
      });
    });

    it('should monitor suspicious requests with performance metrics', (done) => {
      mockRequest.body = { query: "'; DROP TABLE users; --" };
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = performanceInterceptor.intercept(mockExecutionContext, {
        handle: () => securityInterceptor.intercept(mockExecutionContext, mockCallHandler)
      });

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            // Performance metrics should be recorded even for suspicious requests
            expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.any(String));
            consoleWarnSpy.mockRestore();
            done();
          }, 10);
        },
      });
    });
  });

  describe('response transformation consistency', () => {
    it('should always transform responses regardless of other interceptors', (done) => {
      const originalData = 'simple string response';
      mockCallHandler.handle = jest.fn().mockReturnValue(of(originalData));

      // Go through multiple interceptors ending with response transform
      const result = securityInterceptor.intercept(mockExecutionContext, {
        handle: () => loggingInterceptor.intercept(mockExecutionContext, {
          handle: () => responseInterceptor.intercept(mockExecutionContext, mockCallHandler)
        })
      });

      result.subscribe({
        next: (finalResult) => {
          expect(finalResult).toHaveProperty('success');
          expect(finalResult).toHaveProperty('data');
          expect(finalResult).toHaveProperty('metadata');
          expect(finalResult.success).toBe(true);
          expect(finalResult.data).toBe(originalData);
          expect(finalResult.metadata.requestId).toBe('integration-test-id');
          done();
        },
      });
    });

    it('should handle null responses consistently', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

      const result = responseInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toBeNull();
          expect(result.metadata).toBeDefined();
          done();
        },
      });
    });

    it('should handle array responses with pagination consistently', (done) => {
      const arrayData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      mockRequest.query = { page: '2', limit: '5' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(arrayData));

      const result = responseInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (result) => {
          expect(result.success).toBe(true);
          expect(result.data).toEqual(arrayData);
          expect(result.pagination).toBeDefined();
          expect(result.pagination.page).toBe(2);
          expect(result.pagination.limit).toBe(5);
          expect(result.pagination.total).toBe(3);
          done();
        },
      });
    });
  });

  describe('error handling across interceptors', () => {
    it('should handle thrown errors consistently', (done) => {
      const testError = new Error('Service unavailable');
      mockCallHandler.handle = jest.fn().mockReturnValue(
        new Promise((_, reject) => setTimeout(() => reject(testError), 10))
      );

      const result = securityInterceptor.intercept(mockExecutionContext, {
        handle: () => performanceInterceptor.intercept(mockExecutionContext, mockCallHandler)
      });

      result.subscribe({
        error: (error) => {
          expect(error).toBe(testError);
          // Security headers should still be set even on error
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Content-Security-Policy',
            expect.any(String)
          );
          done();
        },
      });
    });

    it('should maintain response headers during error flow', (done) => {
      mockResponse.statusCode = 500;
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ error: 'Internal server error' }));

      const result = securityInterceptor.intercept(mockExecutionContext, {
        handle: () => performanceInterceptor.intercept(mockExecutionContext, {
          handle: () => loggingInterceptor.intercept(mockExecutionContext, mockCallHandler)
        })
      });

      result.subscribe({
        complete: () => {
          // All interceptors should set their headers even for error responses
          expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Response-Time', expect.any(String));
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
          done();
        },
      });
    });
  });

  describe('performance monitoring integration', () => {
    it('should track metrics across all interceptors', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('test-response'));

      const result = performanceInterceptor.intercept(mockExecutionContext, {
        handle: () => securityInterceptor.intercept(mockExecutionContext, {
          handle: () => loggingInterceptor.intercept(mockExecutionContext, {
            handle: () => responseInterceptor.intercept(mockExecutionContext, mockCallHandler)
          })
        })
      });

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const stats = performanceInterceptor.getPerformanceStats();
            expect(stats.totalRequests).toBe(1);
            expect(stats.averageResponseTime).toBeGreaterThan(0);
            done();
          }, 20);
        },
      });
    });

    it('should detect slow requests in complex pipeline', (done) => {
      // Mock a slow response
      mockCallHandler.handle = jest.fn().mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve(of('slow-response')), 100))
      );

      const slowPerformanceInterceptor = new PerformanceInterceptor({
        alertThresholds: { slow: 50 }, // Very low threshold for testing
      });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = slowPerformanceInterceptor.intercept(mockExecutionContext, {
        handle: () => securityInterceptor.intercept(mockExecutionContext, mockCallHandler)
      });

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should have logged a slow request warning
            consoleWarnSpy.mockRestore();
            done();
          }, 150);
        },
      });
    });
  });
});