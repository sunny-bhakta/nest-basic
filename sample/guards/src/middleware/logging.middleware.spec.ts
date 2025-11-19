import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { LoggingMiddleware } from './logging.middleware';
import { Request, Response, NextFunction } from 'express';

describe('LoggingMiddleware', () => {
  let middleware: LoggingMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggingMiddleware],
    }).compile();

    middleware = module.get<LoggingMiddleware>(LoggingMiddleware);
    
    // Mock Logger
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    // Mock request
    mockRequest = {
      method: 'GET',
      originalUrl: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('TestAgent/1.0'),
      headers: {},
    };

    // Mock response
    mockResponse = {
      on: jest.fn(),
      statusCode: 200,
    };

    // Mock next function
    mockNext = jest.fn();

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1234567890);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should generate request ID and log incoming request', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['requestId']).toBeDefined();
      expect(mockRequest['requestId']).toMatch(/^req-\d+-[a-z0-9]+$/);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('🚀')
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /test - 127.0.0.1 - TestAgent/1.0')
      );
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing User-Agent header', () => {
      // Arrange
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('GET /test - 127.0.0.1 - ')
      );
    });

    it('should set up response finish handler', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });

    describe('response finish handler', () => {
      let finishHandler: () => void;

      beforeEach(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
        finishHandler = (mockResponse.on as jest.Mock).mock.calls[0][1];
        
        // Mock duration calculation
        jest.spyOn(Date, 'now').mockReturnValue(1234567890 + 100); // 100ms later
      });

      it('should log successful response with anonymous user', () => {
        // Arrange
        mockResponse.statusCode = 200;

        // Act
        finishHandler();

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('✅')
        );
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('200 - 100ms - Anonymous')
        );
      });

      it('should log response with authenticated user', () => {
        // Arrange
        mockRequest['user'] = {
          username: 'testuser',
          accessLevel: 'PREMIUM'
        };
        mockResponse.statusCode = 200;

        // Act
        finishHandler();

        // Assert
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('User: testuser(PREMIUM)')
        );
      });

      it('should use error log level for 4xx status codes', () => {
        // Arrange
        mockResponse.statusCode = 404;
        const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

        // Act
        finishHandler();

        // Assert
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining('✅')
        );
      });

      it('should use warn log level for 3xx status codes', () => {
        // Arrange
        mockResponse.statusCode = 302;
        const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

        // Act
        finishHandler();

        // Assert
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('✅')
        );
      });

      it('should log slow request warning for requests > 1000ms', () => {
        // Arrange
        jest.spyOn(Date, 'now').mockReturnValue(1234567890 + 1500); // 1500ms later
        const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

        // Act
        finishHandler();

        // Assert
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('🐌')
        );
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Slow request detected: 1500ms')
        );
      });

      it('should not log slow request warning for fast requests', () => {
        // Arrange
        jest.spyOn(Date, 'now').mockReturnValue(1234567890 + 500); // 500ms later
        const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

        // Act
        finishHandler();

        // Assert
        expect(warnSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('🐌')
        );
      });
    });

    it('should handle request with existing requestId', () => {
      // Arrange
      const existingRequestId = 'existing-req-id';
      mockRequest['requestId'] = existingRequestId;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['requestId']).toBe(existingRequestId);
    });

    it('should generate unique request IDs for multiple requests', () => {
      // Arrange
      const mockRequest2 = { ...mockRequest };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      middleware.use(mockRequest2 as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['requestId']).toBeDefined();
      expect(mockRequest2['requestId']).toBeDefined();
      expect(mockRequest['requestId']).not.toBe(mockRequest2['requestId']);
    });
  });
});