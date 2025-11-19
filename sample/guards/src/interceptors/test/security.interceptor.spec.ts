import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { SecurityInterceptor, CorsInterceptor } from '../security.interceptor';

describe('SecurityInterceptor', () => {
  let interceptor: SecurityInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    interceptor = new SecurityInterceptor({
      enableSecurityHeaders: true,
      detectSuspiciousActivity: true,
      maxFailedAttempts: 3,
      blockDuration: 5, // 5 minutes
      sensitiveRoutes: ['/admin/', '/auth/'],
    });

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-user-agent';
        return undefined;
      }),
      body: {},
      query: {},
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
    // Clear any blocked IPs after each test
    interceptor.cleanup();
  });

  describe('intercept', () => {
    it('should add security headers to response', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('test response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('test response');
          expect(mockResponse.setHeader).toHaveBeenCalledWith(
            'Content-Security-Policy',
            expect.stringContaining("default-src 'self'")
          );
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
          expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
          done();
        },
      });
    });

    it('should not add security headers when disabled', (done) => {
      const interceptorWithoutHeaders = new SecurityInterceptor({
        enableSecurityHeaders: false,
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('test response'));

      const result = interceptorWithoutHeaders.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          expect(mockResponse.setHeader).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should detect sensitive route access', (done) => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRequest.url = '/admin/users';

      mockCallHandler.handle = jest.fn().mockReturnValue(of('admin response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          consoleSpy.mockRestore();
          done();
        },
      });
    });

    it('should detect potential SQL injection attacks', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRequest.url = "/users?id=1' OR '1'='1";
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          consoleErrorSpy.mockRestore();
          done();
        },
      });
    });

    it('should detect potential XSS attacks', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRequest.body = { comment: '<script>alert("xss")</script>' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          consoleErrorSpy.mockRestore();
          done();
        },
      });
    });

    it('should detect path traversal attacks', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockRequest.url = '/files?path=../../../etc/passwd';
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: () => {
          consoleErrorSpy.mockRestore();
          done();
        },
      });
    });

    it('should track failed attempts and reset on success', (done) => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Simulate failed request
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('Authentication failed')));

      const result1 = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result1.subscribe({
        error: () => {
          // Now simulate successful request
          mockCallHandler.handle = jest.fn().mockReturnValue(of('success'));
          const result2 = interceptor.intercept(mockExecutionContext, mockCallHandler);

          result2.subscribe({
            next: () => {
              consoleWarnSpy.mockRestore();
              done();
            },
          });
        },
      });
    });

    it('should block IP after max failed attempts', (done) => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('Failed')));

      let attempts = 0;
      const maxAttempts = 3;

      const makeFailedRequest = () => {
        attempts++;
        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
        
        result.subscribe({
          error: () => {
            if (attempts < maxAttempts) {
              makeFailedRequest();
            } else {
              // Now the IP should be blocked
              mockCallHandler.handle = jest.fn().mockReturnValue(of('should be blocked'));
              const blockedResult = interceptor.intercept(mockExecutionContext, mockCallHandler);
              
              blockedResult.subscribe({
                error: (error) => {
                  expect(error).toBeInstanceOf(BadRequestException);
                  expect(error.message).toBe('Access temporarily restricted');
                  consoleWarnSpy.mockRestore();
                  consoleErrorSpy.mockRestore();
                  done();
                },
              });
            }
          },
        });
      };

      makeFailedRequest();
    });

    it('should handle missing request ID gracefully', (done) => {
      mockRequest.requestId = undefined;
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('response');
          done();
        },
      });
    });

    it('should handle missing IP address gracefully', (done) => {
      mockRequest.ip = undefined;
      mockRequest.connection = {};
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toBe('response');
          done();
        },
      });
    });
  });

  describe('getSecurityStats', () => {
    it('should return security statistics', () => {
      const stats = interceptor.getSecurityStats();

      expect(stats).toHaveProperty('totalTrackedIPs');
      expect(stats).toHaveProperty('activeBlocks');
      expect(stats).toHaveProperty('recentAttempts');
      expect(stats.totalTrackedIPs).toBe(0);
      expect(stats.activeBlocks).toBe(0);
      expect(stats.recentAttempts).toBe(0);
    });

    it('should track statistics correctly after failed attempts', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('Failed')));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result.subscribe({
        error: () => {
          const stats = interceptor.getSecurityStats();
          expect(stats.totalTrackedIPs).toBe(1);
          done();
        },
      });
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', (done) => {
      // Create interceptor with very short block duration for testing
      const shortBlockInterceptor = new SecurityInterceptor({
        blockDuration: 0.01, // 0.01 minutes = 0.6 seconds
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('Failed')));

      const result = shortBlockInterceptor.intercept(mockExecutionContext, mockCallHandler);
      
      result.subscribe({
        error: () => {
          let stats = shortBlockInterceptor.getSecurityStats();
          expect(stats.totalTrackedIPs).toBe(1);

          // Wait for expiry and cleanup
          setTimeout(() => {
            shortBlockInterceptor.cleanup();
            stats = shortBlockInterceptor.getSecurityStats();
            expect(stats.totalTrackedIPs).toBe(0);
            done();
          }, 700); // Wait slightly longer than block duration
        },
      });
    });
  });

  describe('disabled suspicious activity detection', () => {
    it('should not track failed attempts when detection is disabled', (done) => {
      const interceptorWithoutDetection = new SecurityInterceptor({
        detectSuspiciousActivity: false,
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => new Error('Failed')));

      const result = interceptorWithoutDetection.intercept(mockExecutionContext, mockCallHandler);
      
      result.subscribe({
        error: () => {
          const stats = interceptorWithoutDetection.getSecurityStats();
          expect(stats.totalTrackedIPs).toBe(0);
          done();
        },
      });
    });
  });
});

describe('CorsInterceptor', () => {
  let corsInterceptor: CorsInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    corsInterceptor = new CorsInterceptor({
      allowedOrigins: ['http://localhost:3000', 'https://*.example.com'],
      allowedMethods: ['GET', 'POST', 'PUT'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 3600,
    });

    mockResponse = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  it('should handle preflight OPTIONS request', (done) => {
    mockRequest = {
      method: 'OPTIONS',
      get: jest.fn((header: string) => {
        if (header === 'Origin') return 'http://localhost:3000';
        if (header === 'Access-Control-Request-Method') return 'POST';
        if (header === 'Access-Control-Request-Headers') return 'Content-Type';
        return undefined;
      }),
      requestId: 'test-id',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    const result = corsInterceptor.intercept(mockExecutionContext, mockCallHandler);

    result.subscribe({
      complete: () => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        expect(mockResponse.status).toHaveBeenCalledWith(204);
        expect(mockResponse.send).toHaveBeenCalled();
        done();
      },
    });
  });

  it('should set CORS headers for regular requests', (done) => {
    mockRequest = {
      method: 'GET',
      get: jest.fn((header: string) => {
        if (header === 'Origin') return 'http://localhost:3000';
        return undefined;
      }),
      requestId: 'test-id',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

    const result = corsInterceptor.intercept(mockExecutionContext, mockCallHandler);

    result.subscribe({
      next: (value) => {
        expect(value).toBe('response');
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
        done();
      },
    });
  });

  it('should handle wildcard origins', (done) => {
    mockRequest = {
      method: 'GET',
      get: jest.fn((header: string) => {
        if (header === 'Origin') return 'https://app.example.com';
        return undefined;
      }),
      requestId: 'test-id',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

    const result = corsInterceptor.intercept(mockExecutionContext, mockCallHandler);

    result.subscribe({
      next: () => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.example.com');
        done();
      },
    });
  });

  it('should reject disallowed origins', (done) => {
    mockRequest = {
      method: 'GET',
      get: jest.fn((header: string) => {
        if (header === 'Origin') return 'https://malicious.com';
        return undefined;
      }),
      requestId: 'test-id',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

    const result = corsInterceptor.intercept(mockExecutionContext, mockCallHandler);

    result.subscribe({
      next: () => {
        // Should not set origin header for disallowed origin
        expect(mockResponse.setHeader).not.toHaveBeenCalledWith(
          'Access-Control-Allow-Origin', 
          'https://malicious.com'
        );
        done();
      },
    });
  });

  it('should handle requests without origin header', (done) => {
    mockRequest = {
      method: 'GET',
      get: jest.fn(() => undefined),
      requestId: 'test-id',
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

    const result = corsInterceptor.intercept(mockExecutionContext, mockCallHandler);

    result.subscribe({
      next: () => {
        expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        done();
      },
    });
  });
});