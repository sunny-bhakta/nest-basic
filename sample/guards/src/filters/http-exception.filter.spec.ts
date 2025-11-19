import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, NotFoundException, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HttpExceptionFilter],
    }).compile();

    filter = module.get<HttpExceptionFilter>(HttpExceptionFilter);

    // Mock request object
    mockRequest = {
      url: '/test-endpoint',
      method: 'GET',
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
    jest.spyOn(filter['logger'], 'warn').mockImplementation();
    jest.spyOn(filter['logger'], 'log').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch method', () => {
    it('should handle BadRequestException (400)', () => {
      const exception = new BadRequestException('Invalid input data');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
        message: 'Invalid input data',
        error: 'BAD_REQUEST',
        requestId: 'unknown',
        details: {
          statusCode: 400,
          message: 'Invalid input data',
          error: 'Bad Request',
        },
      });
    });

    it('should handle UnauthorizedException (401)', () => {
      const exception = new UnauthorizedException('Access denied');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
        message: 'Access denied',
        error: 'UNAUTHORIZED',
        requestId: 'unknown',
        details: {
          statusCode: 401,
          message: 'Access denied',
          error: 'Unauthorized',
        },  
      });
    });

    it('should handle NotFoundException (404)', () => {
      const exception = new NotFoundException('User not found');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 404,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
        message: 'User not found',
        error: 'NOT_FOUND',
        requestId: 'unknown',
        details: {
          statusCode: 404,
          message: 'User not found',
          error: 'Not Found',
        },
      });
    });

    it('should handle InternalServerErrorException (500)', () => {
      const exception = new InternalServerErrorException('Database connection failed');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
        message: 'Database connection failed',
        error: 'INTERNAL_SERVER_ERROR',
        requestId: 'unknown',
        details: {
          statusCode: 500,
          message: 'Database connection failed',
          error: 'Internal Server Error',
        },
      });
    });

    it('should handle custom HttpException with object response', () => {
      const customResponse = {
        message: 'Validation failed',
        errors: ['Field is required', 'Invalid format'],
      };
      const exception = new HttpException(customResponse, HttpStatus.UNPROCESSABLE_ENTITY);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 422,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
        message: 'Validation failed',
        error: 'UNPROCESSABLE_ENTITY',
        requestId: 'unknown',
        details: customResponse,
      });
    });

    it('should handle exception with string response', () => {
      const exception = new HttpException('Simple error message', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/test-endpoint',
        method: 'GET',
        message: 'Simple error message',
        error: 'BAD_REQUEST',
        requestId: 'unknown',
      });
    });
  });

  describe('request context handling', () => {
    it('should extract request context with requestId', () => {
      mockRequest['requestId'] = 'req-123-abc';
      mockRequest['user'] = { id: 'user-456' };

      const exception = new BadRequestException('Test error');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-123-abc',
        })
      );
    });

    it('should handle missing request context gracefully', () => {
      // No requestId or user in request
      const exception = new BadRequestException('Test error');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'unknown',
        })
      );
    });

    it('should extract IP address from different sources', () => {
      // Test with request.ip
      (mockRequest as any).ip = '10.0.0.1';
      const exception = new BadRequestException('Test error');
      filter.catch(exception, mockArgumentsHost);

      // Test with connection.remoteAddress when ip is not available
      (mockRequest as any).ip = undefined;
      mockRequest.connection = { remoteAddress: '10.0.0.2' } as any;
      filter.catch(exception, mockArgumentsHost);

      // Both should work without throwing errors
      expect(mockResponse.json).toHaveBeenCalledTimes(2);
    });
  });

  describe('logging behavior', () => {
    it('should log error for 5xx status codes', () => {
      const exception = new InternalServerErrorException('Server error');
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].error).toHaveBeenCalledWith(
        'HTTP Exception [unknown] 500 GET /test-endpoint - User: anonymous - IP: 192.168.1.100 - Error: Server error',
        exception.stack
      );
    });

    it('should log warning for 4xx status codes', () => {
      const exception = new BadRequestException('Client error');
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'HTTP Exception [unknown] 400 GET /test-endpoint - User: anonymous - IP: 192.168.1.100 - Error: Client error'
      );
    });

    it('should log info for other status codes', () => {
      const exception = new HttpException('Redirect', HttpStatus.MOVED_PERMANENTLY);
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].log).toHaveBeenCalledWith(
        'HTTP Exception [unknown] 301 GET /test-endpoint - User: anonymous - IP: 192.168.1.100 - Error: Redirect'
      );
    });

    it('should include user context in logs when available', () => {
      mockRequest['requestId'] = 'req-abc-123';
      mockRequest['user'] = { id: 'user-789' };

      const exception = new UnauthorizedException('Auth failed');
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'HTTP Exception [req-abc-123] 401 GET /test-endpoint - User: user-789 - IP: 192.168.1.100 - Error: Auth failed'
      );
    });
  });

  describe('error message extraction', () => {
    it('should extract message from string response', () => {
      const exception = new HttpException('Simple message', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.message).toBe('Simple message');
    });

    it('should extract message from object response', () => {
      const response = { message: 'Object message' };
      const exception = new HttpException(response, HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.message).toBe('Object message');
    });

    it('should fall back to exception.message if no message in response', () => {
      const response = { error: 'No message field' };
      const exception = new HttpException(response, HttpStatus.BAD_REQUEST);
      // Manually set exception.message for testing
      Object.defineProperty(exception, 'message', {
        value: 'Fallback message',
        writable: true,
      });

      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.message).toBe('Fallback message');
    });
  });

  describe('response format', () => {
    it('should include all required fields in response', () => {
      const exception = new BadRequestException('Test error');
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).toEqual({
        statusCode: expect.any(Number),
        timestamp: expect.any(String),
        path: expect.any(String),
        method: expect.any(String),
        message: expect.any(String),
        error: expect.any(String),
        requestId: expect.any(String),
        details: expect.any(Object),
      });
    });

    it('should include details for object responses', () => {
      const responseObj = { message: 'Error', details: { field: 'invalid' } };
      const exception = new HttpException(responseObj, HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.details).toEqual(responseObj);
    });

    it('should not include details for string responses', () => {
      const exception = new HttpException('String error', HttpStatus.BAD_REQUEST);
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.details).toBeUndefined();
    });

    it('should format timestamp as ISO string', () => {
      const exception = new BadRequestException('Test error');
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});