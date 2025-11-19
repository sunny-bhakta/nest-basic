import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { 
  CustomExceptionFilter,
  TokenExpiredException,
  InvalidCredentialsException,
  InsufficientAccessLevelException,
  RateLimitExceededException
} from './custom-exception.filter';

describe('CustomExceptionFilter', () => {
  let filter: CustomExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomExceptionFilter],
    }).compile();

    filter = module.get<CustomExceptionFilter>(CustomExceptionFilter);

    // Mock request object
    mockRequest = {
      url: '/api/secure-endpoint',
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
    jest.spyOn(filter['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Custom Exception Classes', () => {
    it('should create TokenExpiredException with default message', () => {
      const exception = new TokenExpiredException();
      expect(exception.message).toBe('Token has expired');
      expect(exception.name).toBe('TokenExpiredException');
      expect(exception).toBeInstanceOf(UnauthorizedException);
    });

    it('should create TokenExpiredException with custom message', () => {
      const exception = new TokenExpiredException('Your session timed out');
      expect(exception.message).toBe('Your session timed out');
      expect(exception.name).toBe('TokenExpiredException');
    });

    it('should create InvalidCredentialsException with default message', () => {
      const exception = new InvalidCredentialsException();
      expect(exception.message).toBe('Invalid credentials provided');
      expect(exception.name).toBe('InvalidCredentialsException');
      expect(exception).toBeInstanceOf(UnauthorizedException);
    });

    it('should create InvalidCredentialsException with custom message', () => {
      const exception = new InvalidCredentialsException('Wrong username or password');
      expect(exception.message).toBe('Wrong username or password');
      expect(exception.name).toBe('InvalidCredentialsException');
    });

    it('should create InsufficientAccessLevelException with access levels', () => {
      const exception = new InsufficientAccessLevelException('ADMIN', 'STANDARD');
      expect(exception.message).toBe('Access denied. Required: ADMIN, Current: STANDARD');
      expect(exception.name).toBe('InsufficientAccessLevelException');
      expect(exception).toBeInstanceOf(ForbiddenException);
    });

    it('should create RateLimitExceededException with retry time', () => {
      const exception = new RateLimitExceededException(60);
      expect(exception.message).toBe('Rate limit exceeded. Try again in 60 seconds');
      expect(exception.name).toBe('RateLimitExceededException');
      expect(exception).toBeInstanceOf(Error);
    });
  });

  describe('catch method - TokenExpiredException', () => {
    it('should handle TokenExpiredException', () => {
      const exception = new TokenExpiredException('Session expired');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        error: 'Unauthorized',
        errorType: 'TOKEN_EXPIRED',
        message: 'Session expired',
        timestamp: expect.any(String),
        path: '/api/secure-endpoint',
        requestId: 'unknown',
        action: 'Please refresh your token and try again',
      });
    });

    it('should log security event for TokenExpiredException', () => {
      const exception = new TokenExpiredException('Token expired');
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'SECURITY: TOKEN_EXPIRED [unknown] 401 GET /api/secure-endpoint - User: anonymous - IP: 192.168.1.100 - UserAgent: Mozilla/5.0 Test Agent'
      );
    });
  });

  describe('catch method - InvalidCredentialsException', () => {
    it('should handle InvalidCredentialsException', () => {
      const exception = new InvalidCredentialsException('Wrong password');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        error: 'Unauthorized',
        errorType: 'INVALID_CREDENTIALS',
        message: 'Wrong password',
        timestamp: expect.any(String),
        path: '/api/secure-endpoint',
        requestId: 'unknown',
        action: 'Please check your credentials and try again',
      });
    });

    it('should log security event for InvalidCredentialsException', () => {
      const exception = new InvalidCredentialsException('Invalid login');
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'SECURITY: INVALID_CREDENTIALS [unknown] 401 GET /api/secure-endpoint - User: anonymous - IP: 192.168.1.100 - UserAgent: Mozilla/5.0 Test Agent'
      );
    });
  });

  describe('catch method - InsufficientAccessLevelException', () => {
    it('should handle InsufficientAccessLevelException', () => {
      const exception = new InsufficientAccessLevelException('ADMIN', 'STANDARD');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        errorType: 'INSUFFICIENT_ACCESS_LEVEL',
        message: 'Access denied. Required: ADMIN, Current: STANDARD',
        timestamp: expect.any(String),
        path: '/api/secure-endpoint',
        requestId: 'unknown',
        action: 'Contact your administrator to upgrade your access level',
      });
    });

    it('should log security event for InsufficientAccessLevelException', () => {
      const exception = new InsufficientAccessLevelException('PREMIUM', 'STANDARD');
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'SECURITY: INSUFFICIENT_ACCESS_LEVEL [unknown] 403 GET /api/secure-endpoint - User: anonymous - IP: 192.168.1.100 - UserAgent: Mozilla/5.0 Test Agent'
      );
    });
  });

  describe('catch method - RateLimitExceededException', () => {
    it('should handle RateLimitExceededException', () => {
      const exception = new RateLimitExceededException(120);
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 429,
        error: 'Too Many Requests',
        errorType: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Try again in 120 seconds',
        timestamp: expect.any(String),
        path: '/api/secure-endpoint',
        requestId: 'unknown',
        action: 'Please wait and try again later',
      });
    });

    it('should log warning for RateLimitExceededException', () => {
      const exception = new RateLimitExceededException(60);
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'RATE_LIMIT_EXCEEDED [unknown] 429 GET /api/secure-endpoint - User: anonymous - IP: 192.168.1.100 - UserAgent: Mozilla/5.0 Test Agent'
      );
    });
  });

  describe('catch method - Standard Exceptions', () => {
    it('should handle standard UnauthorizedException', () => {
      const exception = new UnauthorizedException('Access denied');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 401,
        error: 'Unauthorized',
        errorType: 'UNAUTHORIZED',
        message: 'Access denied',
        timestamp: expect.any(String),
        path: '/api/secure-endpoint',
        requestId: 'unknown',
      });
    });

    it('should handle standard ForbiddenException', () => {
      const exception = new ForbiddenException('Forbidden resource');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'Forbidden',
        errorType: 'FORBIDDEN',
        message: 'Forbidden resource',
        timestamp: expect.any(String),
        path: '/api/secure-endpoint',
        requestId: 'unknown',
      });
    });

    it('should handle unknown custom exceptions', () => {
      class UnknownCustomException extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'UnknownCustomException';
        }
      }

      const exception = new UnknownCustomException('Unknown error');
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'Internal Server Error',
        errorType: 'UNKNOWN_CUSTOM_ERROR',
        message: 'Unknown error',
        timestamp: expect.any(String),
        path: '/api/secure-endpoint',
        requestId: 'unknown',
      });
    });
  });

  describe('request context handling', () => {
    it('should extract full request context', () => {
      mockRequest['requestId'] = 'req-custom-123';
      mockRequest['user'] = { id: 'user-456' };
      (mockRequest as any).ip = '10.0.0.1';

      const exception = new TokenExpiredException();
      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-custom-123',
        })
      );

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'SECURITY: TOKEN_EXPIRED [req-custom-123] 401 GET /api/secure-endpoint - User: user-456 - IP: 10.0.0.1 - UserAgent: Mozilla/5.0 Test Agent'
      );
    });

    it('should handle missing user agent gracefully', () => {
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      const exception = new InvalidCredentialsException();
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'SECURITY: INVALID_CREDENTIALS [unknown] 401 GET /api/secure-endpoint - User: anonymous - IP: 192.168.1.100 - UserAgent: unknown'
      );
    });

    it('should handle missing IP address gracefully', () => {
      (mockRequest as any).ip = undefined;
      mockRequest.connection = undefined;

      const exception = new TokenExpiredException();
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('IP: unknown')
      );
    });

    it('should extract IP from connection.remoteAddress when ip is missing', () => {
      (mockRequest as any).ip = undefined;
      mockRequest.connection = { remoteAddress: '172.16.0.1' } as any;

      const exception = new InvalidCredentialsException();
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('IP: 172.16.0.1')
      );
    });
  });

  describe('logging behavior', () => {
    it('should use security prefix for 401 and 403 errors', () => {
      const unauthorizedException = new UnauthorizedException('Test');
      const forbiddenException = new ForbiddenException('Test');

      filter.catch(unauthorizedException, mockArgumentsHost);
      filter.catch(forbiddenException, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: UNAUTHORIZED')
      );
      expect(filter['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: FORBIDDEN')
      );
    });

    it('should not use security prefix for rate limit errors', () => {
      const exception = new RateLimitExceededException(60);
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        expect.stringContaining('RATE_LIMIT_EXCEEDED')
      );
      expect(filter['logger'].warn).not.toHaveBeenCalledWith(
        expect.stringContaining('SECURITY:')
      );
    });

    it('should include all context in log message', () => {
      mockRequest['requestId'] = 'req-test-789';
      mockRequest['user'] = { id: 'user-abc' };
      mockRequest.method = 'POST';
      mockRequest.url = '/api/auth/login';

      const exception = new InvalidCredentialsException();
      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'SECURITY: INVALID_CREDENTIALS [req-test-789] 401 POST /api/auth/login - User: user-abc - IP: 192.168.1.100 - UserAgent: Mozilla/5.0 Test Agent'
      );
    });
  });

  describe('response format', () => {
    it('should include action field for custom exceptions', () => {
      const tokenException = new TokenExpiredException();
      const credentialsException = new InvalidCredentialsException();
      const accessException = new InsufficientAccessLevelException('ADMIN', 'USER');
      const rateLimitException = new RateLimitExceededException(30);

      filter.catch(tokenException, mockArgumentsHost);
      filter.catch(credentialsException, mockArgumentsHost);
      filter.catch(accessException, mockArgumentsHost);
      filter.catch(rateLimitException, mockArgumentsHost);

      const calls = (mockResponse.json as jest.Mock).mock.calls;
      
      expect(calls[0][0].action).toBe('Please refresh your token and try again');
      expect(calls[1][0].action).toBe('Please check your credentials and try again');
      expect(calls[2][0].action).toBe('Contact your administrator to upgrade your access level');
      expect(calls[3][0].action).toBe('Please wait and try again later');
    });

    it('should not include action field for standard exceptions', () => {
      const unauthorized = new UnauthorizedException();
      const forbidden = new ForbiddenException();

      filter.catch(unauthorized, mockArgumentsHost);
      filter.catch(forbidden, mockArgumentsHost);

      const calls = (mockResponse.json as jest.Mock).mock.calls;
      
      expect(calls[0][0].action).toBeUndefined();
      expect(calls[1][0].action).toBeUndefined();
    });

    it('should format timestamp as ISO string', () => {
      const exception = new TokenExpiredException();
      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include errorType for all handled exceptions', () => {
      const exceptions = [
        { exception: new TokenExpiredException(), expectedType: 'TOKEN_EXPIRED' },
        { exception: new InvalidCredentialsException(), expectedType: 'INVALID_CREDENTIALS' },
        { exception: new InsufficientAccessLevelException('A', 'B'), expectedType: 'INSUFFICIENT_ACCESS_LEVEL' },
        { exception: new RateLimitExceededException(60), expectedType: 'RATE_LIMIT_EXCEEDED' },
        { exception: new UnauthorizedException(), expectedType: 'UNAUTHORIZED' },
        { exception: new ForbiddenException(), expectedType: 'FORBIDDEN' },
      ];

      exceptions.forEach(({ exception, expectedType }) => {
        filter.catch(exception, mockArgumentsHost);
      });

      const calls = (mockResponse.json as jest.Mock).mock.calls;
      
      exceptions.forEach(({ expectedType }, index) => {
        expect(calls[index][0].errorType).toBe(expectedType);
      });
    });
  });
});