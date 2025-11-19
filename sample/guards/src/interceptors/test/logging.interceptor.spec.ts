import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from '../logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    interceptor = new LoggingInterceptor();

    mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'test-user-agent';
        if (header === 'Authorization') return 'Bearer test-token';
        return undefined;
      }),
      body: {},
      query: {},
      params: {},
      headers: {
        'user-agent': 'test-user-agent',
        'authorization': 'Bearer test-token'
      },
      requestId: 'test-request-id',
    };

    mockResponse = {
      statusCode: 200,
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

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('basic functionality', () => {
    it('should log request and response for successful requests', (done) => {
      const responseData = { message: 'success' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (value) => {
          expect(value).toEqual(responseData);
        },
        complete: () => {
          // Give time for logging to complete
          setTimeout(() => {
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('REQUEST [test-request-id] GET /test')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('RESPONSE [test-request-id] GET /test - Status: 200')
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle requests without request ID', (done) => {
      mockRequest.requestId = undefined;
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('REQUEST [unknown] GET /test')
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle error responses', (done) => {
      const error = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          setTimeout(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('ERROR [test-request-id] GET /test')
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('sensitive data filtering', () => {
    it('should filter sensitive data from request body', (done) => {
      mockRequest.body = {
        username: 'testuser',
        password: 'secret123',
        token: 'abc123',
        apikey: 'key123',
        normalField: 'normalValue'
      };

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const logCall = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('REQUEST') && call[0].includes('Body:')
            );
            expect(logCall).toBeDefined();
            
            const logMessage = logCall[0];
            expect(logMessage).toContain('password":"***"');
            expect(logMessage).toContain('token":"***"');
            expect(logMessage).toContain('apikey":"***"');
            expect(logMessage).toContain('normalField":"normalValue"');
            done();
          }, 10);
        },
      });
    });

    it('should filter sensitive data from headers', (done) => {
      mockRequest.headers.authorization = 'Bearer sensitive-token';
      mockRequest.headers['x-api-key'] = 'sensitive-api-key';

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const logCall = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('REQUEST') && call[0].includes('Headers:')
            );
            expect(logCall).toBeDefined();
            
            const logMessage = logCall[0];
            expect(logMessage).toContain('authorization":"***"');
            done();
          }, 10);
        },
      });
    });

    it('should filter sensitive data from query parameters', (done) => {
      mockRequest.query = {
        search: 'laptop',
        api_key: 'sensitive-key',
        token: 'auth-token'
      };

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const logCall = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('REQUEST') && call[0].includes('Query:')
            );
            expect(logCall).toBeDefined();
            
            const logMessage = logCall[0];
            expect(logMessage).toContain('api_key":"***"');
            expect(logMessage).toContain('token":"***"');
            expect(logMessage).toContain('search":"laptop"');
            done();
          }, 10);
        },
      });
    });

    it('should handle nested sensitive data in objects', (done) => {
      mockRequest.body = {
        user: {
          name: 'John',
          password: 'secret',
          profile: {
            apikey: 'nested-key'
          }
        }
      };

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const logCall = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('REQUEST') && call[0].includes('Body:')
            );
            expect(logCall).toBeDefined();
            
            const logMessage = logCall[0];
            expect(logMessage).toContain('password":"***"');
            expect(logMessage).toContain('apikey":"***"');
            expect(logMessage).toContain('name":"John"');
            done();
          }, 10);
        },
      });
    });
  });

  describe('performance tracking', () => {
    it('should track and log response times', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const responseLog = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('RESPONSE') && call[0].includes('Duration:')
            );
            expect(responseLog).toBeDefined();
            expect(responseLog[0]).toMatch(/Duration: \d+ms/);
            done();
          }, 10);
        },
      });
    });

    it('should warn about slow requests', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve(of('slow response')), 100))
      );

      // Mock performance.now to simulate slow request
      const originalPerformanceNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 0;
        return 2000; // 2 seconds
      });

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('SLOW REQUEST')
            );
            performance.now = originalPerformanceNow;
            done();
          }, 50);
        },
      });
    });
  });

  describe('security monitoring', () => {
    it('should detect suspicious login patterns', (done) => {
      mockRequest.url = '/auth/login';
      mockResponse.statusCode = 401;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: false }));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('FAILED LOGIN ATTEMPT')
            );
            done();
          }, 10);
        },
      });
    });

    it('should detect suspicious patterns in requests', (done) => {
      mockRequest.url = '/admin/users';
      mockRequest.body = { query: "'; DROP TABLE users; --" };

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('SUSPICIOUS REQUEST PATTERN')
            );
            done();
          }, 10);
        },
      });
    });

    it('should track multiple failed attempts from same IP', (done) => {
      mockRequest.url = '/auth/login';
      mockResponse.statusCode = 401;

      let attemptCount = 0;
      const makeFailedAttempt = () => {
        attemptCount++;
        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
        
        result.subscribe({
          complete: () => {
            if (attemptCount < 3) {
              setTimeout(makeFailedAttempt, 10);
            } else {
              setTimeout(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                  expect.stringContaining('MULTIPLE FAILED ATTEMPTS')
                );
                done();
              }, 10);
            }
          },
        });
      };

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ success: false }));
      makeFailedAttempt();
    });

    it('should monitor admin endpoint access', (done) => {
      mockRequest.url = '/admin/delete-user';
      mockRequest.method = 'DELETE';

      mockCallHandler.handle = jest.fn().mockReturnValue(of('deleted'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('ADMIN ENDPOINT ACCESS')
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('response body handling', () => {
    it('should log response body when status is successful', (done) => {
      const responseData = { users: [{ id: 1, name: 'John' }] };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const responseLog = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('RESPONSE') && call[0].includes('Body:')
            );
            expect(responseLog).toBeDefined();
            expect(responseLog[0]).toContain('"users":[{"id":1,"name":"John"}]');
            done();
          }, 10);
        },
      });
    });

    it('should not log response body for large responses', (done) => {
      const largeResponse = { data: 'x'.repeat(15000) }; // Larger than 10KB limit
      mockCallHandler.handle = jest.fn().mockReturnValue(of(largeResponse));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const responseLog = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('RESPONSE') && call[0].includes('[Response too large]')
            );
            expect(responseLog).toBeDefined();
            done();
          }, 10);
        },
      });
    });

    it('should filter sensitive data from response body', (done) => {
      const responseData = {
        user: { name: 'John', token: 'secret-token' },
        apikey: 'response-key'
      };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const responseLog = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('RESPONSE') && call[0].includes('Body:')
            );
            expect(responseLog).toBeDefined();
            
            const logMessage = responseLog[0];
            expect(logMessage).toContain('token":"***"');
            expect(logMessage).toContain('apikey":"***"');
            expect(logMessage).toContain('name":"John"');
            done();
          }, 10);
        },
      });
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors gracefully', (done) => {
      // Create circular reference that can't be JSON.stringify'd
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      mockRequest.body = circularObj;
      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            const logCall = consoleLogSpy.mock.calls.find(call => 
              call[0].includes('REQUEST') && call[0].includes('[Circular reference detected]')
            );
            expect(logCall).toBeDefined();
            done();
          }, 10);
        },
      });
    });

    it('should handle missing request properties gracefully', (done) => {
      mockRequest.body = undefined;
      mockRequest.query = undefined;
      mockRequest.headers = undefined;
      mockRequest.ip = undefined;

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('REQUEST')
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle response header access errors', (done) => {
      mockResponse.getHeaders = jest.fn(() => {
        throw new Error('Headers access error');
      });

      mockCallHandler.handle = jest.fn().mockReturnValue(of('response'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            // Should still log response even with header errors
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('RESPONSE')
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('different HTTP methods and status codes', () => {
    it('should handle POST requests', (done) => {
      mockRequest.method = 'POST';
      mockRequest.body = { name: 'New Item' };
      mockResponse.statusCode = 201;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ id: 1, name: 'New Item' }));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('REQUEST [test-request-id] POST /test')
            );
            expect(consoleLogSpy).toHaveBeenCalledWith(
              expect.stringContaining('RESPONSE [test-request-id] POST /test - Status: 201')
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle 4xx client errors', (done) => {
      mockResponse.statusCode = 404;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ error: 'Not found' }));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining('CLIENT ERROR [test-request-id] GET /test - Status: 404')
            );
            done();
          }, 10);
        },
      });
    });

    it('should handle 5xx server errors', (done) => {
      mockResponse.statusCode = 500;

      mockCallHandler.handle = jest.fn().mockReturnValue(of({ error: 'Internal server error' }));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        complete: () => {
          setTimeout(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
              expect.stringContaining('SERVER ERROR [test-request-id] GET /test - Status: 500')
            );
            done();
          }, 10);
        },
      });
    });
  });

  describe('logging functionality validation', () => {
    it('should be defined and implement NestInterceptor', () => {
      expect(interceptor).toBeDefined();
      expect(typeof interceptor.intercept).toBe('function');
    });

    it('should have proper logger instance', () => {
      expect(interceptor['logger']).toBeDefined();
      expect(interceptor['logger'].constructor.name).toBe('Logger');
    });

    it('should handle multiple concurrent requests', (done) => {
      let completedRequests = 0;
      const totalRequests = 3;

      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === totalRequests) {
          setTimeout(() => {
            // All requests should have been logged
            expect(consoleLogSpy.mock.calls.length).toBeGreaterThanOrEqual(totalRequests * 2); // Request + Response logs
            done();
          }, 20);
        }
      };

      // Make multiple concurrent requests
      for (let i = 0; i < totalRequests; i++) {
        mockRequest.url = `/test/${i}`;
        mockRequest.requestId = `test-${i}`;
        mockCallHandler.handle = jest.fn().mockReturnValue(of(`response-${i}`));
        
        const result = interceptor.intercept(mockExecutionContext, mockCallHandler);
        result.subscribe({ complete: checkCompletion });
      }
    });
  });
});