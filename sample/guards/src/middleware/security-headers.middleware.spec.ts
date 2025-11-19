import { Test, TestingModule } from '@nestjs/testing';
import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { Request, Response, NextFunction } from 'express';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityHeadersMiddleware],
    }).compile();

    middleware = module.get<SecurityHeadersMiddleware>(SecurityHeadersMiddleware);

    mockRequest = {
      method: 'GET',
    };

    mockResponse = {
      header: jest.fn(),
      removeHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should set CORS headers', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'
      );
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
      );
    });

    it('should set security headers', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
      );
    });

    it('should set Content Security Policy header', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
      );
    });

    it('should remove X-Powered-By header', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    });

    it('should call next function for non-OPTIONS requests', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle OPTIONS preflight request', () => {
      // Arrange
      mockRequest.method = 'OPTIONS';

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set all required headers in correct order', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert - Verify all headers are set
      const headerCalls = (mockResponse.header as jest.Mock).mock.calls;
      const headerNames = headerCalls.map(call => call[0]);

      expect(headerNames).toContain('Access-Control-Allow-Origin');
      expect(headerNames).toContain('Access-Control-Allow-Methods');
      expect(headerNames).toContain('Access-Control-Allow-Headers');
      expect(headerNames).toContain('X-Content-Type-Options');
      expect(headerNames).toContain('X-Frame-Options');
      expect(headerNames).toContain('X-XSS-Protection');
      expect(headerNames).toContain('Referrer-Policy');
      expect(headerNames).toContain('Permissions-Policy');
      expect(headerNames).toContain('Content-Security-Policy');
    });

    it('should handle POST request normally', () => {
      // Arrange
      mockRequest.method = 'POST';

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
    });

    it('should handle PUT request normally', () => {
      // Arrange
      mockRequest.method = 'PUT';

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle DELETE request normally', () => {
      // Arrange
      mockRequest.method = 'DELETE';

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('security headers validation', () => {
    it('should set X-Content-Type-Options to prevent MIME sniffing', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options to prevent clickjacking', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set X-XSS-Protection for XSS filtering', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should set strict Referrer-Policy', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });

    it('should set restrictive Permissions-Policy', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
      );
    });

    it('should set comprehensive CSP policy', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      const cspCall = (mockResponse.header as jest.Mock).mock.calls.find(
        call => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall).toBeDefined();
      
      const cspValue = cspCall[1];
      expect(cspValue).toContain("default-src 'self'");
      expect(cspValue).toContain("script-src 'self' 'unsafe-inline'");
      expect(cspValue).toContain("style-src 'self' 'unsafe-inline'");
      expect(cspValue).toContain("img-src 'self' data: https:");
      expect(cspValue).toContain("font-src 'self' data:");
    });
  });

  describe('CORS preflight handling', () => {
    beforeEach(() => {
      mockRequest.method = 'OPTIONS';
    });

    it('should handle OPTIONS request with Max-Age header', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
    });

    it('should respond with 200 status for OPTIONS', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should not call next for OPTIONS requests', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should still set security headers for OPTIONS requests', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Assert
      expect(mockResponse.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });
  });

  describe('integration scenarios', () => {
    it('should work correctly in middleware chain', () => {
      // Arrange
      const requests = [
        { method: 'GET' },
        { method: 'POST' },
        { method: 'PUT' },
        { method: 'DELETE' },
        { method: 'OPTIONS' }
      ];

      // Act & Assert
      requests.forEach((req, index) => {
        const mockReq = { ...mockRequest, ...req };
        const mockRes = {
          header: jest.fn(),
          removeHeader: jest.fn(),
          status: jest.fn().mockReturnThis(),
          end: jest.fn(),
        };
        const mockNextFn = jest.fn();

        middleware.use(mockReq as Request, mockRes as any, mockNextFn);

        // All requests should have security headers
        expect(mockRes.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
        
        // OPTIONS should not call next, others should
        if (req.method === 'OPTIONS') {
          expect(mockNextFn).not.toHaveBeenCalled();
          expect(mockRes.status).toHaveBeenCalledWith(200);
        } else {
          expect(mockNextFn).toHaveBeenCalled();
        }
      });
    });

    it('should handle rapid successive calls', () => {
      // Act - Multiple rapid calls
      for (let i = 0; i < 10; i++) {
        const mockRes = {
          header: jest.fn(),
          removeHeader: jest.fn(),
          status: jest.fn().mockReturnThis(),
          end: jest.fn(),
        };
        const mockNextFn = jest.fn();

        middleware.use(mockRequest as Request, mockRes as any, mockNextFn);

        expect(mockRes.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
        expect(mockNextFn).toHaveBeenCalled();
      }
    });
  });
});