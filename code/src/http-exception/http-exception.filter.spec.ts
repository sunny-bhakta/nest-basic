import { HttpExceptionFilter } from './http-exception.filter';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: jest.Mocked<ArgumentsHost>;
  let mockHttpArgumentsHost: any;
  let mockResponse: jest.Mocked<Response>;

  beforeEach(() => {
    // Create mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    // Create mock HTTP arguments host
    mockHttpArgumentsHost = {
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn(),
    };

    // Create mock arguments host
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as any;

    filter = new HttpExceptionFilter();

    // Spy on console.log to verify logging
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Filter instantiation', () => {
    it('should be defined', () => {
      expect(filter).toBeDefined();
    });

    it('should be an instance of HttpExceptionFilter', () => {
      expect(filter).toBeInstanceOf(HttpExceptionFilter);
    });

    it('should implement ExceptionFilter interface', () => {
      expect(filter.catch).toBeDefined();
      expect(typeof filter.catch).toBe('function');
    });
  });

  describe('catch method', () => {
    it('should handle BadRequestException (400)', () => {
      // Arrange
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockArgumentsHost.switchToHttp).toHaveBeenCalledTimes(1);
      expect(mockHttpArgumentsHost.getResponse).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Bad Request',
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', 'Bad Request');
    });

    it('should handle UnauthorizedException (401)', () => {
      // Arrange
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Unauthorized',
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', 'Unauthorized');
    });

    it('should handle ForbiddenException (403)', () => {
      // Arrange
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Forbidden',
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', 'Forbidden');
    });

    it('should handle NotFoundException (404)', () => {
      // Arrange
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Not Found',
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', 'Not Found');
    });

    it('should handle InternalServerErrorException (500)', () => {
      // Arrange
      const exception = new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal Server Error',
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', 'Internal Server Error');
    });

    it('should handle custom HttpException with custom status code', () => {
      // Arrange
      const customStatus = 418; // I'm a teapot
      const exception = new HttpException('Custom error message', customStatus);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(customStatus);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: customStatus,
        message: 'Custom error message',
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', 'Custom error message');
    });

    it('should handle HttpException with object message', () => {
      // Arrange
      const messageObject = {
        error: 'Validation failed',
        message: ['name should not be empty', 'age must be a number'],
      };
      const exception = new HttpException(messageObject, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: messageObject,
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', messageObject);
    });

    it('should handle HttpException with empty message', () => {
      // Arrange
      const exception = new HttpException('', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: '',
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', '');
    });

    it('should handle HttpException with null message', () => {
      // Arrange
      const exception = new HttpException(null as any, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: null,
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', null);
    });

    it('should handle HttpException with undefined message', () => {
      // Arrange
      const exception = new HttpException(undefined as any, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: undefined,
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', undefined);
    });
  });

  describe('Response formatting', () => {
    it('should return response with correct structure', () => {
      // Arrange
      const exception = new HttpException('Test message', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: expect.any(Number),
          message: expect.anything(),
        })
      );
    });

    it('should call response methods in correct order', () => {
      // Arrange
      const exception = new HttpException('Test message', HttpStatus.BAD_REQUEST);
      const callOrder: string[] = [];

      mockResponse.status.mockImplementation((code) => {
        callOrder.push('status');
        return mockResponse;
      });

      mockResponse.json.mockImplementation((body) => {
        callOrder.push('json');
        return mockResponse;
      });

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(callOrder).toEqual(['status', 'json']);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test message',
      });
    });

    it('should return response object that allows method chaining', () => {
      // Arrange
      const exception = new HttpException('Test message', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveReturnedWith(mockResponse);
      expect(mockResponse.json).toHaveReturnedWith(mockResponse);
    });
  });

  describe('Host context handling', () => {
    it('should switch to HTTP context', () => {
      // Arrange
      const exception = new HttpException('Test message', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockArgumentsHost.switchToHttp).toHaveBeenCalledTimes(1);
    });

    it('should get response from HTTP context', () => {
      // Arrange
      const exception = new HttpException('Test message', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockHttpArgumentsHost.getResponse).toHaveBeenCalledTimes(1);
    });

    it('should handle different HTTP context responses', () => {
      // Arrange
      const alternativeResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockHttpArgumentsHost.getResponse.mockReturnValue(alternativeResponse);
      const exception = new HttpException('Test message', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(alternativeResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(alternativeResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Test message',
      });
    });
  });

  describe('Exception status handling', () => {
    it('should extract status from HttpException', () => {
      // Arrange
      const exception = new HttpException('Test message', HttpStatus.CONFLICT);
      const getStatusSpy = jest.spyOn(exception, 'getStatus');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(getStatusSpy).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    });

    it('should handle exceptions with different status codes', () => {
      // Arrange
      const statusCodes = [
        HttpStatus.BAD_REQUEST,
        HttpStatus.UNAUTHORIZED,
        HttpStatus.FORBIDDEN,
        HttpStatus.NOT_FOUND,
        HttpStatus.CONFLICT,
        HttpStatus.INTERNAL_SERVER_ERROR,
      ];

      statusCodes.forEach(statusCode => {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        
        const exception = new HttpException('Test message', statusCode);

        // Act
        filter.catch(exception, mockArgumentsHost);

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(statusCode);
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: statusCode,
          message: 'Test message',
        });
      });
    });
  });

  describe('Logging behavior', () => {
    it('should log exception message to console', () => {
      // Arrange
      const testMessage = 'Test error message';
      const exception = new HttpException(testMessage, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', testMessage);
      expect(console.log).toHaveBeenCalledTimes(1);
    });

    it('should log different types of messages', () => {
      // Test string message
      const stringException = new HttpException('String message', HttpStatus.BAD_REQUEST);
      filter.catch(stringException, mockArgumentsHost);
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', 'String message');

      jest.clearAllMocks();

      // Test object message
      const objectMessage = { error: 'Object message' };
      const objectException = new HttpException(objectMessage, HttpStatus.BAD_REQUEST);
      filter.catch(objectException, mockArgumentsHost);
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', objectMessage);

      jest.clearAllMocks();

      // Test array message
      const arrayMessage = ['Error 1', 'Error 2'];
      const arrayException = new HttpException(arrayMessage, HttpStatus.BAD_REQUEST);
      filter.catch(arrayException, mockArgumentsHost);
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', arrayMessage);
    });

    it('should log before sending response', () => {
      // Arrange
      const exception = new HttpException('Test message', HttpStatus.BAD_REQUEST);
      let logCalled = false;
      let responseCalled = false;

      (console.log as jest.Mock).mockImplementation(() => {
        logCalled = true;
        expect(responseCalled).toBe(false); // Response should not be called yet
      });

      mockResponse.status.mockImplementation(() => {
        responseCalled = true;
        expect(logCalled).toBe(true); // Log should have been called
        return mockResponse;
      });

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(logCalled).toBe(true);
      expect(responseCalled).toBe(true);
    });
  });

  describe('Error edge cases', () => {
    it('should handle exception with status 0', () => {
      // Arrange
      const exception = new HttpException('Zero status', 0);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(0);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 0,
        message: 'Zero status',
      });
    });

    it('should handle exception with very high status code', () => {
      // Arrange
      const exception = new HttpException('High status', 999);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(999);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 999,
        message: 'High status',
      });
    });

    it('should handle exception with negative status code', () => {
      // Arrange
      const exception = new HttpException('Negative status', -1);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(-1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: -1,
        message: 'Negative status',
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should work with real-world validation error format', () => {
      // Arrange
      const validationError = {
        message: [
          'name should not be empty',
          'age must be a positive number',
          'email must be a valid email'
        ],
        error: 'Bad Request',
        statusCode: 400
      };
      const exception = new HttpException(validationError, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        message: validationError,
      });
      expect(console.log).toHaveBeenCalledWith('From HTTP Exception File :', validationError);
    });

    it('should work with authentication error scenario', () => {
      // Arrange
      const authError = 'JWT token has expired';
      const exception = new HttpException(authError, HttpStatus.UNAUTHORIZED);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: authError,
      });
    });

    it('should work with resource not found scenario', () => {
      // Arrange
      const notFoundError = 'Cat with ID 123 not found';
      const exception = new HttpException(notFoundError, HttpStatus.NOT_FOUND);

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: notFoundError,
      });
    });
  });
});
