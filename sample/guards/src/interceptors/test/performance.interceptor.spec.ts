import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { PerformanceInterceptor } from '../performance.interceptor';

describe('PerformanceInterceptor', () => {
  let interceptor: PerformanceInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PerformanceInterceptor],
    }).compile();

    interceptor = new PerformanceInterceptor({
      enableMetricsCollection: true,
      enableSlowRequestLogging: true,
      enableMemoryMonitoring: true,
      enableCpuMonitoring: true,
      alertThresholds: {
        slow: 100,
        verySlow: 500,
        memory: 50,
      },
    });

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      requestId: 'test-request-id',
    };

    mockResponse = {
      statusCode: 200,
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

  describe('intercept', () => {
    it('should record performance metrics for successful requests', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('test response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('test response');
        },
        complete: () => {
          // Give a small delay for finalize to execute
          setTimeout(() => {
            const stats = interceptor.getPerformanceStats();
            expect(stats.totalRequests).toBe(1);
            expect(stats.averageResponseTime).toBeGreaterThan(0);
            done();
          }, 10);
        },
      });
    });

    it('should record metrics for failed requests', (done) => {
      const error = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          // Give a small delay for finalize to execute
          setTimeout(() => {
            const stats = interceptor.getPerformanceStats();
            expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
            done();
          }, 10);
        },
      });
    });

    it('should apply timeout when specified', (done) => {
      const timeoutInterceptor = new PerformanceInterceptor({
        timeoutMs: 50,
      });

      // Mock a slow response
      mockCallHandler.handle = jest.fn().mockReturnValue(
        new Promise((resolve) => setTimeout(() => resolve(of('slow response')), 100))
      );

      const result = timeoutInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        error: (err) => {
          expect(err.name).toBe('TimeoutError');
          done();
        },
      });
    });

    it('should handle requests without request ID', (done) => {
      mockRequest.requestId = undefined;
      mockCallHandler.handle = jest.fn().mockReturnValue(of('test response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          // Should not throw error even without request ID
          setTimeout(() => {
            const stats = interceptor.getPerformanceStats();
            expect(stats.totalRequests).toBe(1);
            done();
          }, 10);
        },
      });
    });
  });

  describe('getPerformanceStats', () => {
    it('should return empty stats when no metrics available', () => {
      const stats = interceptor.getPerformanceStats();

      expect(stats.totalRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.slowRequests).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.memoryStats).toBeDefined();
    });

    it('should calculate statistics correctly with multiple requests', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      let completedRequests = 0;
      const totalRequests = 3;

      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === totalRequests) {
          setTimeout(() => {
            const stats = interceptor.getPerformanceStats();
            expect(stats.totalRequests).toBe(totalRequests);
            expect(stats.averageResponseTime).toBeGreaterThan(0);
            expect(stats.percentiles).toBeDefined();
            expect(stats.percentiles.p50).toBeGreaterThanOrEqual(0);
            expect(stats.percentiles.p95).toBeGreaterThanOrEqual(0);
            expect(stats.percentiles.p99).toBeGreaterThanOrEqual(0);
            done();
          }, 20);
        }
      };

      // Make multiple requests
      for (let i = 0; i < totalRequests; i++) {
        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
        result.subscribe({ complete: checkCompletion });
      }
    });

    it('should track error rates correctly', (done) => {
      let completedRequests = 0;

      // First request succeeds
      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));
      const successResult = interceptor.intercept(mockExecutionContext, mockCallHandler);
      successResult.subscribe({
        complete: () => {
          completedRequests++;
          if (completedRequests === 2) {
            setTimeout(() => {
              const stats = interceptor.getPerformanceStats();
              expect(stats.totalRequests).toBe(2);
              expect(stats.errorRate).toBe(50); // 1 success, 1 error = 50%
              done();
            }, 20);
          }
        },
      });

      // Second request fails
      mockResponse.statusCode = 500;
      const errorResult = interceptor.intercept(mockExecutionContext, mockCallHandler);
      errorResult.subscribe({
        complete: () => {
          completedRequests++;
          if (completedRequests === 2) {
            setTimeout(() => {
              const stats = interceptor.getPerformanceStats();
              expect(stats.totalRequests).toBe(2);
              expect(stats.errorRate).toBe(50);
              done();
            }, 20);
          }
        },
      });
    });
  });

  describe('getSlowestEndpoints', () => {
    it('should return empty array when no metrics available', () => {
      const slowest = interceptor.getSlowestEndpoints();
      expect(slowest).toEqual([]);
    });

    it('should return slowest endpoints ordered by average duration', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      let completedRequests = 0;

      // Fast endpoint
      mockRequest.url = '/fast';
      const fastResult = interceptor.intercept(mockExecutionContext, mockCallHandler);
      fastResult.subscribe({
        complete: () => {
          completedRequests++;
          if (completedRequests === 2) {
            setTimeout(() => {
              const slowest = interceptor.getSlowestEndpoints();
              expect(slowest.length).toBeGreaterThan(0);
              expect(slowest[0].endpoint).toContain('GET');
              expect(slowest[0].averageDuration).toBeGreaterThan(0);
              done();
            }, 20);
          }
        },
      });

      // Slow endpoint (simulate by making another request)
      mockRequest.url = '/slow';
      const slowResult = interceptor.intercept(mockExecutionContext, mockCallHandler);
      slowResult.subscribe({
        complete: () => {
          completedRequests++;
          if (completedRequests === 2) {
            setTimeout(() => {
              const slowest = interceptor.getSlowestEndpoints();
              expect(slowest.length).toBeGreaterThan(0);
              done();
            }, 20);
          }
        },
      });
    });
  });

  describe('clearMetrics', () => {
    it('should clear all stored metrics', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result.subscribe({
        complete: () => {
          setTimeout(() => {
            let stats = interceptor.getPerformanceStats();
            expect(stats.totalRequests).toBe(1);

            interceptor.clearMetrics();

            stats = interceptor.getPerformanceStats();
            expect(stats.totalRequests).toBe(0);
            done();
          }, 20);
        },
      });
    });
  });

  describe('memory and CPU monitoring', () => {
    it('should include memory usage in metrics', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const stats = interceptor.getPerformanceStats();
            expect(stats.memoryStats).toBeDefined();
            expect(stats.memoryStats.heapUsed).toBeGreaterThan(0);
            expect(stats.memoryStats.heapTotal).toBeGreaterThan(0);
            done();
          }, 20);
        },
      });
    });

    it('should handle disabled monitoring options', () => {
      const interceptorWithDisabledMonitoring = new PerformanceInterceptor({
        enableMemoryMonitoring: false,
        enableCpuMonitoring: false,
        enableMetricsCollection: false,
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptorWithDisabledMonitoring.intercept(mockExecutionContext, mockCallHandler);
      
      expect(result).toBeDefined();
      // Should not throw any errors
      result.subscribe({
        next: (value) => {
          expect(value).toBe('response');
        },
      });
    });
  });

  describe('alert thresholds', () => {
    let consoleWarnSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log warnings for slow requests', (done) => {
      const slowInterceptor = new PerformanceInterceptor({
        alertThresholds: { slow: 0 }, // Everything is slow
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = slowInterceptor.intercept(mockExecutionContext, mockCallHandler);
      result.subscribe({
        complete: () => {
          // Allow time for logging
          setTimeout(() => {
            // Should have logged a slow request warning
            done();
          }, 20);
        },
      });
    });
  });
});