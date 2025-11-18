import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitMiddleware } from './rate-limit.middleware';
import { Request, Response, NextFunction } from 'express';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitMiddleware],
    }).compile();

    middleware = module.get<RateLimitMiddleware>(RateLimitMiddleware);

    mockResponse = {
      set: jest.fn(),
    };

    mockNext = jest.fn();

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1234567890000); // Fixed timestamp
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Clear the private store between tests
    (middleware as any).store = {};
  });

  describe('use', () => {
    beforeEach(() => {
      mockRequest = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' } as any,
      };
    });

    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should allow first request from new IP', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': expect.any(String),
      });
    });

    it('should track requests for authenticated users by user ID', () => {
      // Arrange
      mockRequest['user'] = { id: 123, username: 'testuser' };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      
      // Verify the store uses user ID
      const store = (middleware as any).store;
      expect(Object.keys(store)).toContain('user:123');
    });

    it('should track requests for anonymous users by IP', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      
      // Verify the store uses IP
      const store = (middleware as any).store;
      expect(Object.keys(store)).toContain('ip:127.0.0.1');
    });

    it('should increment request count for subsequent requests', () => {
      // Act - First request
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Act - Second request
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.set).toHaveBeenLastCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '98', // Decremented
        'X-RateLimit-Reset': expect.any(String),
      });
    });

    it('should throw HttpException when rate limit exceeded', () => {
      // Arrange - Simulate 100 requests already made
      const clientId = 'ip:127.0.0.1';
      (middleware as any).store[clientId] = {
        count: 100,
        resetTime: Date.now() + 900000, // 15 minutes from now
      };

      // Act & Assert
      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(HttpException);

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow(
        expect.objectContaining({
          response: expect.objectContaining({
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            error: 'Rate limit exceeded',
            retryAfter: expect.any(Number),
          }),
        })
      );
    });

    it('should reset count when window expires', () => {
      // Arrange - Set up expired entry
      const clientId = 'ip:127.0.0.1';
      (middleware as any).store[clientId] = {
        count: 50,
        resetTime: Date.now() - 1000, // Expired 1 second ago
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99', // Reset to 99 (1 request made)
        'X-RateLimit-Reset': expect.any(String),
      });
    });

    it('should handle X-Forwarded-For header for real client IP', () => {
      // Arrange
      mockRequest.headers = { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const store = (middleware as any).store;
      expect(Object.keys(store)).toContain('ip:192.168.1.100');
    });

    it('should handle X-Forwarded-For as array', () => {
      // Arrange
      mockRequest.headers = { 'x-forwarded-for': ['192.168.1.200'] };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const store = (middleware as any).store;
      expect(Object.keys(store)).toContain('ip:192.168.1.200');
    });

    it('should set correct remaining count when at limit', () => {
      // Arrange - Set up client at limit
      const clientId = 'ip:127.0.0.1';
      (middleware as any).store[clientId] = {
        count: 99,
        resetTime: Date.now() + 900000,
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.set).toHaveBeenCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0', // At limit
        'X-RateLimit-Reset': expect.any(String),
      });
    });
  });

  describe('getClientIdentifier', () => {
    it('should return user ID for authenticated requests', () => {
      // Arrange
      mockRequest = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' } as any,
      } as any;
      mockRequest['user'] = { id: 456, username: 'testuser2' };

      // Act
      const clientId = middleware['getClientIdentifier'](mockRequest as Request);

      // Assert
      expect(clientId).toBe('user:456');
    });

    it('should return IP for anonymous requests', () => {
      // Arrange
      mockRequest = {
        headers: {},
        connection: { remoteAddress: '192.168.1.1' } as any,
      };

      // Act
      const clientId = middleware['getClientIdentifier'](mockRequest as Request);

      // Assert
      expect(clientId).toBe('ip:192.168.1.1');
    });

    it('should prefer forwarded IP over connection IP', () => {
      // Arrange
      mockRequest = {
        headers: { 'x-forwarded-for': '203.0.113.1' },
        connection: { remoteAddress: '127.0.0.1' } as any,
      };

      // Act
      const clientId = middleware['getClientIdentifier'](mockRequest as Request);

      // Assert
      expect(clientId).toBe('ip:203.0.113.1');
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should clean up expired entries during random cleanup', () => {
      // Arrange
      const now = Date.now();
      (middleware as any).store = {
        'ip:expired': {
          count: 10,
          resetTime: now - 1000, // Expired
        },
        'ip:valid': {
          count: 5,
          resetTime: now + 900000, // Valid
        },
      };

      // Mock Math.random to trigger cleanup
      jest.spyOn(Math, 'random').mockReturnValue(0.005); // Less than 0.01

      // Act
      middleware['cleanupExpiredEntries'](now);

      // Assert
      const store = (middleware as any).store;
      expect(store['ip:expired']).toBeUndefined();
      expect(store['ip:valid']).toBeDefined();
    });

    it('should not clean up when random value is high', () => {
      // Arrange
      const now = Date.now();
      (middleware as any).store = {
        'ip:expired': {
          count: 10,
          resetTime: now - 1000, // Expired
        },
      };

      // Mock Math.random to skip cleanup
      jest.spyOn(Math, 'random').mockReturnValue(0.5); // Greater than 0.01

      // Act
      middleware['cleanupExpiredEntries'](now);

      // Assert
      const store = (middleware as any).store;
      expect(store['ip:expired']).toBeDefined(); // Still exists
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid requests from same client', () => {
      // Act - Make 5 rapid requests
      for (let i = 0; i < 5; i++) {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(5);
      expect(mockResponse.set).toHaveBeenLastCalledWith({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': expect.any(String),
      });
    });

    it('should handle different clients independently', () => {
      // Arrange
      const mockRequest = {
        headers: {},
        connection: { remoteAddress: '127.0.0.1' } as any,
      };

      const mockRequest2 = {
        headers: {},
        connection: { remoteAddress: '192.168.1.2' } as any,
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      middleware.use(mockRequest2 as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledTimes(2);
      
      const store = (middleware as any).store;
      expect(Object.keys(store)).toHaveLength(2);
      expect(store['ip:127.0.0.1']).toBeDefined();
      expect(store['ip:192.168.1.2']).toBeDefined();
    });
  });
});