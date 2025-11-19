import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, RequestTimeoutException, BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CacheInterceptor, TimeoutInterceptor, RateLimitInterceptor } from '../cache.interceptor';

describe('CacheInterceptor', () => {
  let interceptor: CacheInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    interceptor = new CacheInterceptor({
      ttl: 300, // 5 minutes
      keyGenerator: (req) => `${req.method}-${req.url}`,
      excludeRoutes: ['/auth/', '/admin/'],
    });

    mockRequest = {
      method: 'GET',
      url: '/test',
      query: {},
      ip: '127.0.0.1',
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

  afterEach(() => {
    // Clear cache after each test
    interceptor.invalidateCache();
  });

  describe('caching functionality', () => {
    it('should cache successful GET responses', (done) => {
      const responseData = { id: 1, name: 'Test Item' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      // First request
      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: (value) => {
          expect(value).toEqual(responseData);
          expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);

          // Second request should use cache
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: (cachedValue) => {
              expect(cachedValue).toEqual(responseData);
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(1); // Still only called once
              done();
            },
          });
        },
      });
    });

    it('should not cache POST requests by default', (done) => {
      mockRequest.method = 'POST';
      const responseData = { success: true };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      // First request
      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          // Second request should not use cache
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: () => {
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(2); // Called twice
              done();
            },
          });
        },
      });
    });

    it('should not cache excluded routes', (done) => {
      mockRequest.url = '/auth/login';
      const responseData = { token: 'abc123' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      // First request
      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          // Second request should not use cache
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: () => {
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
              done();
            },
          });
        },
      });
    });

    it('should not cache error responses', (done) => {
      mockResponse.statusCode = 500;
      const responseData = { error: 'Internal server error' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: () => {
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
              done();
            },
          });
        },
      });
    });

    it('should generate different cache keys for different URLs', (done) => {
      const responseData1 = { data: 'response1' };
      const responseData2 = { data: 'response2' };
      
      mockCallHandler.handle = jest.fn()
        .mockReturnValueOnce(of(responseData1))
        .mockReturnValueOnce(of(responseData2));

      // First request
      mockRequest.url = '/test1';
      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: (value) => {
          expect(value).toEqual(responseData1);

          // Second request with different URL
          mockRequest.url = '/test2';
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: (value2) => {
              expect(value2).toEqual(responseData2);
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
              done();
            },
          });
        },
      });
    });

    it('should respect custom shouldCache function', (done) => {
      const customCacheInterceptor = new CacheInterceptor({
        ttl: 300,
        shouldCache: (req, res) => req.url.includes('/cacheable/') && res.statusCode === 200,
      });

      mockRequest.url = '/non-cacheable/test';
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      // First request - should not cache
      const result1 = customCacheInterceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          // Second request - should not use cache
          const result2 = customCacheInterceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: () => {
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
              done();
            },
          });
        },
      });
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result.subscribe({
        next: () => {
          const stats = interceptor.getCacheStats();
          expect(stats.size).toBe(1);
          expect(stats.hits).toBe(0);
          expect(stats.misses).toBe(1);
          expect(stats.hitRate).toBe(0);
          done();
        },
      });
    });

    it('should track cache hits and misses', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      // First request (miss)
      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          // Second request (hit)
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: () => {
              const stats = interceptor.getCacheStats();
              expect(stats.hits).toBe(1);
              expect(stats.misses).toBe(1);
              expect(stats.hitRate).toBe(50);
              done();
            },
          });
        },
      });
    });

    it('should clear cache when requested', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          let stats = interceptor.getCacheStats();
          expect(stats.size).toBe(1);

          interceptor.invalidateCache();

          stats = interceptor.getCacheStats();
          expect(stats.size).toBe(0);
          expect(stats.hits).toBe(0);
          expect(stats.misses).toBe(0);
          done();
        },
      });
    });

    it('should handle TTL expiration', (done) => {
      const shortTtlInterceptor = new CacheInterceptor({
        ttl: 0.01, // Very short TTL for testing (0.6 seconds)
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      // First request
      const result1 = shortTtlInterceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          expect(mockCallHandler.handle).toHaveBeenCalledTimes(1);

          // Wait for TTL to expire
          setTimeout(() => {
            // Second request should not use expired cache
            const result2 = shortTtlInterceptor.intercept(mockExecutionContext, mockCallHandler);
            
            result2.subscribe({
              next: () => {
                expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
                done();
              },
            });
          }, 700); // Wait longer than TTL
        },
      });
    });

    it('should handle errors gracefully', (done) => {
      const error = new Error('Service error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          
          // Cache should not contain the error
          const stats = interceptor.getCacheStats();
          expect(stats.size).toBe(0);
          done();
        },
      });
    });
  });
});

describe('TimeoutInterceptor', () => {
  let interceptor: TimeoutInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;

  beforeEach(async () => {
    interceptor = new TimeoutInterceptor({
      timeout: 100, // 100ms default timeout
      routeTimeouts: {
        '/slow/': 200,
        '/upload/': 500,
      },
    });

    mockRequest = {
      method: 'GET',
      url: '/test',
      requestId: 'test-request-id',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  describe('timeout functionality', () => {
    it('should apply default timeout to requests', (done) => {
      // Mock slow response (150ms, longer than 100ms timeout)
      mockCallHandler.handle = jest.fn().mockReturnValue(
        of('slow response').pipe(delay(150))
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        error: (error) => {
          expect(error.name).toBe('TimeoutError');
          done();
        },
      });
    });

    it('should complete fast requests successfully', (done) => {
      // Mock fast response (50ms, faster than 100ms timeout)
      mockCallHandler.handle = jest.fn().mockReturnValue(
        of('fast response').pipe(delay(50))
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('fast response');
          done();
        },
        error: () => {
          done.fail('Should not timeout for fast requests');
        },
      });
    });

    it('should apply route-specific timeout', (done) => {
      mockRequest.url = '/slow/endpoint';
      
      // Mock response that's 150ms (longer than default 100ms but within route timeout of 200ms)
      mockCallHandler.handle = jest.fn().mockReturnValue(
        of('route-specific response').pipe(delay(150))
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('route-specific response');
          done();
        },
        error: () => {
          done.fail('Should not timeout with route-specific timeout');
        },
      });
    });

    it('should still timeout with route-specific timeout if exceeded', (done) => {
      mockRequest.url = '/slow/endpoint';
      
      // Mock response that's 250ms (longer than route timeout of 200ms)
      mockCallHandler.handle = jest.fn().mockReturnValue(
        of('too slow response').pipe(delay(250))
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        error: (error) => {
          expect(error.name).toBe('TimeoutError');
          done();
        },
      });
    });

    it('should use longest matching route pattern', (done) => {
      mockRequest.url = '/upload/images/large.jpg';
      
      // Mock response that's 300ms (within upload timeout of 500ms)
      mockCallHandler.handle = jest.fn().mockReturnValue(
        of('upload response').pipe(delay(300))
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('upload response');
          done();
        },
        error: () => {
          done.fail('Should not timeout for upload route');
        },
      });
    });

    it('should handle requests without specific route timeout', (done) => {
      mockRequest.url = '/other/endpoint';
      
      // Mock fast response (should use default timeout)
      mockCallHandler.handle = jest.fn().mockReturnValue(
        of('other response').pipe(delay(50))
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('other response');
          done();
        },
      });
    });

    it('should handle errors before timeout', (done) => {
      const error = new Error('Service error');
      mockCallHandler.handle = jest.fn().mockReturnValue(
        throwError(() => error).pipe(delay(50))
      );

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(err.name).not.toBe('TimeoutError');
          done();
        },
      });
    });

    it('should work with no route timeouts configured', (done) => {
      const simpleTimeoutInterceptor = new TimeoutInterceptor({
        timeout: 100,
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(
        of('simple response').pipe(delay(50))
      );

      const result = simpleTimeoutInterceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('simple response');
          done();
        },
      });
    });
  });
});

describe('RateLimitInterceptor', () => {
  let interceptor: RateLimitInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    interceptor = new RateLimitInterceptor({
      windowMs: 60000, // 1 minute window
      maxRequests: 5,
      keyGenerator: (req) => req.ip || 'unknown',
      skipSuccessfulRequests: false,
    });

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      requestId: 'test-request-id',
    };

    mockResponse = {
      statusCode: 200,
      setHeader: jest.fn(),
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

  afterEach(() => {
    // Clear rate limit data after each test
    interceptor['rateLimitData'].clear();
  });

  describe('rate limiting functionality', () => {
    it('should allow requests within rate limit', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('success');
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(Number));
          done();
        },
      });
    });

    it('should block requests that exceed rate limit', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));
      let requestCount = 0;

      const makeRequest = () => {
        requestCount++;
        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
        
        result.subscribe({
          next: () => {
            if (requestCount < 5) {
              makeRequest(); // Make another request
            } else {
              // Now make the 6th request that should be blocked
              const blockedResult = interceptor.intercept(mockExecutionContext, mockCallHandler);
              
              blockedResult.subscribe({
                error: (error) => {
                  expect(error).toBeInstanceOf(BadRequestException);
                  expect(error.message).toContain('Rate limit exceeded');
                  done();
                },
              });
            }
          },
          error: done.fail,
        });
      };

      makeRequest();
    });

    it('should set correct rate limit headers', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));

      // Make 3 requests
      let completed = 0;
      const checkHeaders = () => {
        completed++;
        if (completed === 3) {
          // Check final headers
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 2); // 5 - 3 = 2
          done();
        }
      };

      for (let i = 0; i < 3; i++) {
        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
        result.subscribe({ complete: checkHeaders });
      }
    });

    it('should use custom key generator', (done) => {
      const customKeyInterceptor = new RateLimitInterceptor({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (req) => `${req.ip}-${req.method}`,
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));

      // Make requests with different methods
      mockRequest.method = 'GET';
      const result1 = customKeyInterceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          mockRequest.method = 'POST';
          const result2 = customKeyInterceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: () => {
              // Both should succeed as they have different keys
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
              done();
            },
          });
        },
      });
    });

    it('should reset rate limit after window expires', (done) => {
      const shortWindowInterceptor = new RateLimitInterceptor({
        windowMs: 100, // Very short window for testing
        maxRequests: 1,
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));

      // First request should succeed
      const result1 = shortWindowInterceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          // Immediate second request should fail
          const result2 = shortWindowInterceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            error: () => {
              // Wait for window to reset
              setTimeout(() => {
                // Third request should succeed after reset
                const result3 = shortWindowInterceptor.intercept(mockExecutionContext, mockCallHandler);
                
                result3.subscribe({
                  next: () => {
                    expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
                    done();
                  },
                  error: done.fail,
                });
              }, 150);
            },
          });
        },
      });
    });

    it('should skip successful requests when configured', (done) => {
      const skipSuccessfulInterceptor = new RateLimitInterceptor({
        windowMs: 60000,
        maxRequests: 2,
        skipSuccessfulRequests: true,
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));
      
      // Make 3 successful requests - they should all pass because we skip counting successful ones
      let completed = 0;
      const checkCompletion = () => {
        completed++;
        if (completed === 3) {
          expect(mockCallHandler.handle).toHaveBeenCalledTimes(3);
          done();
        }
      };

      for (let i = 0; i < 3; i++) {
        const result = skipSuccessfulInterceptor.intercept(mockExecutionContext, mockCallHandler);
        result.subscribe({ complete: checkCompletion });
      }
    });

    it('should handle requests with missing IP gracefully', (done) => {
      mockRequest.ip = undefined;
      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('success');
          // Should still set headers even with unknown IP
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 5);
          done();
        },
      });
    });

    it('should handle different IPs independently', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));

      // Make requests from first IP
      mockRequest.ip = '192.168.1.1';
      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result1.subscribe({
        next: () => {
          // Make request from different IP
          mockRequest.ip = '192.168.1.2';
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);
          
          result2.subscribe({
            next: () => {
              // Both should succeed as they have different IPs
              expect(mockCallHandler.handle).toHaveBeenCalledTimes(2);
              done();
            },
          });
        },
      });
    });

    it('should be properly configured', () => {
      expect(interceptor).toBeDefined();
      expect(typeof interceptor.intercept).toBe('function');
    });

    it('should handle cleanup of expired rate limit entries', () => {
      // Test that the interceptor can handle internal cleanup
      expect(interceptor['rateLimitData']).toBeDefined();
      expect(interceptor['rateLimitData'].size).toBe(0);
    });
  });
});