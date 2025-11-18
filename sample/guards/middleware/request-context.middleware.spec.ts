import { Test, TestingModule } from '@nestjs/testing';
import { RequestContextMiddleware } from './request-context.middleware';
import { Request, Response, NextFunction } from 'express';

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestContextMiddleware],
    }).compile();

    middleware = module.get<RequestContextMiddleware>(RequestContextMiddleware);

    mockRequest = {
      method: 'GET',
      originalUrl: '/api/test',
      get: jest.fn().mockReturnValue('TestAgent/2.0'),
      headers: {},
      connection: { remoteAddress: '192.168.1.10' } as any,
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockNext = jest.fn();

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should generate request ID when not present', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['requestId']).toBeDefined();
      expect(mockRequest['requestId']).toMatch(/^req-\d+-[a-z0-9]+$/);
    });

    it('should preserve existing request ID', () => {
      // Arrange
      const existingRequestId = 'existing-req-123';
      mockRequest['requestId'] = existingRequestId;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['requestId']).toBe(existingRequestId);
    });

    it('should set start time', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['startTime']).toBe(1234567890123);
    });

    it('should create request context with correct properties', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['context']).toEqual({
        requestId: mockRequest['requestId'],
        startTime: 1234567890123,
        method: 'GET',
        url: '/api/test',
        userAgent: 'TestAgent/2.0',
        ip: '192.168.1.10',
        user: null,
      });
    });

    it('should set X-Request-ID response header', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Request-ID',
        mockRequest['requestId']
      );
    });

    it('should call next function', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing User-Agent header', () => {
      // Arrange
      (mockRequest.get as jest.Mock).mockReturnValue(undefined);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['context'].userAgent).toBeUndefined();
    });
  });

  describe('getClientIp', () => {
    it('should return IP from x-forwarded-for header when present', () => {
      // Arrange
      mockRequest.headers = { 'x-forwarded-for': '203.0.113.195' };

      // Act
      const ip = (middleware as any).getClientIp(mockRequest as Request);

      // Assert
      expect(ip).toBe('203.0.113.195');
    });

    it('should handle x-forwarded-for as array', () => {
      // Arrange
      mockRequest.headers = { 'x-forwarded-for': ['203.0.113.200', '10.0.0.1'] };

      // Act
      const ip = (middleware as any).getClientIp(mockRequest as Request);

      // Assert
      expect(ip).toBe('203.0.113.200'); // First IP in array
    });

    it('should handle x-forwarded-for with comma-separated values', () => {
      // Arrange
      mockRequest.headers = { 'x-forwarded-for': '203.0.113.210, 10.0.0.5, 192.168.1.1' };

      // Act
      const ip = (middleware as any).getClientIp(mockRequest as Request);

      // Assert
      expect(ip).toBe('203.0.113.210'); // First IP in comma-separated list
    });

    it('should fallback to connection remoteAddress when no forwarded header', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.connection = { remoteAddress: '192.168.1.50' } as any;

      // Act
      const ip = (middleware as any).getClientIp(mockRequest as Request);

      // Assert
      expect(ip).toBe('192.168.1.50');
    });

    it('should fallback to socket remoteAddress when connection unavailable', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.connection = { remoteAddress: undefined } as any;
      mockRequest.socket = { remoteAddress: '10.0.0.100' } as any;

      // Act
      const ip = (middleware as any).getClientIp(mockRequest as Request);

      // Assert
      expect(ip).toBe('10.0.0.100');
    });

    it('should return "unknown" when no IP source available', () => {
      // Arrange
      mockRequest.headers = {};
      mockRequest.connection = {} as any;
      mockRequest.socket = {} as any;

      // Act
      const ip = (middleware as any).getClientIp(mockRequest as Request);

      // Assert
      expect(ip).toBe('unknown');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete middleware flow', () => {
      // Arrange
      const expectedRequestId = expect.stringMatching(/^req-\d+-[a-z0-9]+$/);

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['requestId']).toEqual(expectedRequestId);
      expect(mockRequest['startTime']).toBe(1234567890123);
      expect(mockRequest['context']).toMatchObject({
        requestId: expectedRequestId,
        startTime: 1234567890123,
        method: 'GET',
        url: '/api/test',
        userAgent: 'TestAgent/2.0',
        ip: '192.168.1.10',
        user: null,
      });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', expectedRequestId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle request with complex IP scenario', () => {
      // Arrange
      mockRequest.headers = { 'x-forwarded-for': '8.8.8.8, 192.168.1.1' };
      mockRequest.connection = { remoteAddress: '10.0.0.1' } as any;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['context'].ip).toBe('8.8.8.8'); // Should use forwarded IP
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

    it('should handle POST request with different properties', () => {
      // Arrange
      mockRequest.method = 'POST';
      mockRequest.originalUrl = '/api/users';
      (mockRequest.get as jest.Mock).mockReturnValue('Mozilla/5.0');

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['context']).toMatchObject({
        method: 'POST',
        url: '/api/users',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should work with existing request ID from logging middleware', () => {
      // Arrange - Simulate logging middleware already setting request ID
      const loggingRequestId = 'req-1234567890-abc123';
      mockRequest['requestId'] = loggingRequestId;

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockRequest['requestId']).toBe(loggingRequestId);
      expect(mockRequest['context'].requestId).toBe(loggingRequestId);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', loggingRequestId);
    });
  });
});