import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost } from '@nestjs/common';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    // Mock request object
    mockRequest = {
      url: '/api/test-endpoint',
      method: 'POST',
      ip: '192.168.1.100',
      connection: { remoteAddress: '192.168.1.100' } as any,
      get: jest.fn().mockReturnValue('Mozilla/5.0 Test Agent'),
    };

    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as any;

    // Mock logger to avoid console output during tests
    jest.spyOn(filter['logger'], 'error').mockImplementation();
    
    // Mock generateErrorId method
    jest.spyOn(filter as any, 'generateErrorId').mockReturnValue('err-20231118-103000-abc123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch method', () => {
    it('should handle JavaScript Error objects', () => {
      const exception = new Error('Database connection failed');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        errorId: 'err-20231118-103000-abc123',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'unknown',
        support: 'Please contact support with this error ID if the problem persists',
      });
    });

    it('should handle TypeError exceptions', () => {
      const exception = new TypeError('Cannot read property of undefined');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        errorId: 'err-20231118-103000-abc123',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'unknown',
        support: 'Please contact support with this error ID if the problem persists',
      });
    });

    it('should handle ReferenceError exceptions', () => {
      const exception = new ReferenceError('Variable is not defined');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        errorId: 'err-20231118-103000-abc123',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'unknown',
        support: 'Please contact support with this error ID if the problem persists',
      });
    });

    it('should handle string exceptions', () => {
      const exception = 'String error message';
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        errorId: 'err-20231118-103000-abc123',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'unknown',
        support: 'Please contact support with this error ID if the problem persists',
      });
    });

    it('should handle null/undefined exceptions', () => {
      const nullException = null;
      const undefinedException = undefined;

      filter.catch(nullException, mockArgumentsHost);
      filter.catch(undefinedException, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledTimes(2);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      
      const calls = (mockResponse.json as jest.Mock).mock.calls;
      expect(calls[0][0].message).toBe('An unexpected error occurred');
      expect(calls[1][0].message).toBe('An unexpected error occurred');
    });

    it('should handle object exceptions without message', () => {
      const exception = { code: 'UNKNOWN_ERROR', details: 'Some details' };
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        errorId: 'err-20231118-103000-abc123',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'unknown',
        support: 'Please contact support with this error ID if the problem persists',
      });
    });

    it('should handle exceptions with custom properties', () => {
      class CustomSystemError extends Error {
        public readonly code: string;
        public readonly details: any;

        constructor(message: string, code: string, details: any) {
          super(message);
          this.code = code;
          this.details = details;
          this.name = 'CustomSystemError';
        }
      }

      const exception = new CustomSystemError(
        'System failure',
        'SYS_001',
        { component: 'database', retry: false }
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        errorId: 'err-20231118-103000-abc123',
        timestamp: expect.any(String),
        path: '/api/test-endpoint',
        requestId: 'unknown',
        support: 'Please contact support with this error ID if the problem persists',
      });
    });
  });

  describe('request context handling', () => {
    it('should extract request context with requestId and user', () => {
      mockRequest['requestId'] = 'req-global-456';
      mockRequest['user'] = { id: 'user-789' };

      const exception = new Error('Test error');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-global-456',
        })
      );
    });

    it('should handle missing request context gracefully', () => {
      // No requestId or user in request
      const exception = new Error('Test error');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'unknown',
        })
      );
    });

    it('should extract IP address from different sources', () => {
      // Test with connection.remoteAddress when ip is not available
      (mockRequest as any).ip = undefined;
      mockRequest.connection = { remoteAddress: '10.0.0.1' } as any;

      const exception = new Error('Test error');
      filter.catch(exception, mockArgumentsHost);

      // Should not throw and should complete successfully
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle missing connection object gracefully', () => {
      (mockRequest as any).ip = undefined;
      mockRequest.connection = undefined;

      const exception = new Error('Test error');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  describe('logging behavior', () => {
    it('should log with error level and include stack trace', () => {
      const exception = new Error('Database connection failed');
      exception.stack = 'Error: Database connection failed\n    at test.js:1:1';

      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].error).toHaveBeenCalledWith(
        'SYSTEM: Unhandled error [unknown] 500 POST /api/test-endpoint - User: anonymous - IP: 192.168.1.100 - Error ID: err-20231118-103000-abc123',
        exception.stack
      );
    });

    it('should log with request context when available', () => {
      mockRequest['requestId'] = 'req-system-123';
      mockRequest['user'] = { id: 'user-456' };
      (mockRequest as any).ip = '172.16.0.1';

      const exception = new TypeError('Cannot access property');
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].error).toHaveBeenCalledWith(
        'SYSTEM: Unhandled error [req-system-123] 500 POST /api/test-endpoint - User: user-456 - IP: 172.16.0.1 - Error ID: err-20231118-103000-abc123',
        exception.stack
      );
    });

    it('should handle logging when exception has no stack', () => {
      const exception = new Error('No stack error');
      delete exception.stack;

      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].error).toHaveBeenCalledWith(
        expect.stringContaining('SYSTEM: Unhandled error'),
        undefined
      );
    });

    it('should log string exceptions appropriately', () => {
      const exception = 'Plain string error';
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].error).toHaveBeenCalledWith(
        'SYSTEM: Unhandled error [unknown] 500 POST /api/test-endpoint - User: anonymous - IP: 192.168.1.100 - Error ID: err-20231118-103000-abc123',
        undefined
      );
    });
  });

  describe('security and information filtering', () => {
    it('should not expose original error message', () => {
      const sensitiveError = new Error('Database password is invalid for user admin');
      filter.catch(sensitiveError, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.message).toBe('An unexpected error occurred');
      expect(responseCall.message).not.toContain('password');
      expect(responseCall.message).not.toContain('admin');
    });

    it('should not expose stack traces in response', () => {
      const exception = new Error('System error');
      exception.stack = 'Error: System error\n    at /home/app/database/connection.js:45:12\n    at /home/app/config/secrets.js:23:5';

      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.stack).toBeUndefined();
      expect(JSON.stringify(responseCall)).not.toContain('database');
      expect(JSON.stringify(responseCall)).not.toContain('secrets');
    });

    it('should not expose exception constructor name', () => {
      class DatabaseConnectionError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'DatabaseConnectionError';
        }
      }

      const exception = new DatabaseConnectionError('Connection timeout');
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(JSON.stringify(responseCall)).not.toContain('DatabaseConnectionError');
    });

    it('should provide generic error response for all exception types', () => {
      const exceptions = [
        new Error('Generic error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        'String error',
        { customProperty: 'Custom object error' },
      ];

      exceptions.forEach((exception) => {
        filter.catch(exception, mockArgumentsHost);
      });

      const calls = (mockResponse.json as jest.Mock).mock.calls;
      
      calls.forEach((call) => {
        const response = call[0];
        expect(response.statusCode).toBe(500);
        expect(response.error).toBe('Internal Server Error');
        expect(response.message).toBe('An unexpected error occurred');
        expect(response.errorId).toBe('err-20231118-103000-abc123');
        expect(response.support).toBe('Please contact support with this error ID if the problem persists');
      });
    });
  });

  describe('generateErrorId method', () => {
    beforeEach(() => {
      // Restore the original method for these tests
      (filter as any).generateErrorId.mockRestore();
    });

    it('should generate unique error IDs', () => {
      const id1 = (filter as any).generateErrorId();
      const id2 = (filter as any).generateErrorId();

      expect(id1).toMatch(/^err-\d{8}-\d{6}-[a-f0-9]{6}$/);
      expect(id2).toMatch(/^err-\d{8}-\d{6}-[a-f0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });

    it('should have consistent error ID format', () => {
      const errorId = (filter as any).generateErrorId();
      
      // Format: err-YYYYMMDD-HHMMSS-XXXXXX
      const parts = errorId.split('-');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('err');
      expect(parts[1]).toHaveLength(8); // YYYYMMDD
      expect(parts[2]).toHaveLength(6); // HHMMSS
      expect(parts[3]).toHaveLength(6); // Random hex
    });

    it('should include current date and time in error ID', () => {
      const now = new Date();
      const errorId = (filter as any).generateErrorId();
      
      const dateStr = now.getFullYear().toString() + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0');
      
      expect(errorId).toContain(dateStr);
    });
  });

  describe('response format', () => {
    it('should include all required fields in response', () => {
      const exception = new Error('Test error');
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).toEqual({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        errorId: expect.any(String),
        timestamp: expect.any(String),
        path: expect.any(String),
        requestId: expect.any(String),
        support: expect.any(String),
      });
    });

    it('should format timestamp as ISO string', () => {
      const exception = new Error('Test error');
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should always return 500 status code', () => {
      const exceptions = [
        new Error('Error'),
        new TypeError('TypeError'),
        'String error',
        { object: 'error' },
        null,
        undefined,
      ];

      exceptions.forEach((exception) => {
        filter.catch(exception, mockArgumentsHost);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
      });
    });

    it('should include support message for user guidance', () => {
      const exception = new Error('Test error');
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.support).toBe('Please contact support with this error ID if the problem persists');
    });
  });
});