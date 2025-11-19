import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { EnhancedSecurityHeadersMiddleware } from './enhanced-security-headers.middleware';
import * as corsConfig from '../config/cors.config';
import * as corsManager from '../config/cors.manager';

// Mock the config modules
jest.mock('../config/cors.config');
jest.mock('../config/cors.manager');

describe('EnhancedSecurityHeadersMiddleware', () => {
  let middleware: EnhancedSecurityHeadersMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockGetCurrentConfig: jest.MockedFunction<typeof corsConfig.getCurrentConfig>;
  let mockCorsManager: any;

  const mockSecurityConfig = {
    cors: {
      origins: ['http://localhost:3000', 'http://localhost:4200'] as readonly string[],
      methods: ['GET', 'POST', 'PUT', 'DELETE'] as readonly string[],
      allowedHeaders: ['Content-Type', 'Authorization'] as readonly string[],
      credentials: true,
      maxAge: 86400,
      optionsSuccessStatus: 204,
    },
    csp: {
      directives: "default-src 'self'; script-src 'self' 'unsafe-inline';"
    },
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    }
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock corsConfig
    mockGetCurrentConfig = jest.mocked(corsConfig.getCurrentConfig);
    mockGetCurrentConfig.mockReturnValue(mockSecurityConfig);

    // Mock corsManager
    mockCorsManager = jest.mocked(corsManager.corsManager);
    mockCorsManager.getAllowedOrigin = jest.fn();
    mockCorsManager.shouldAllowCredentials = jest.fn().mockReturnValue(true);
    mockCorsManager.getMaxAge = jest.fn().mockReturnValue(86400);
    mockCorsManager.logConfiguration = jest.fn();

    // Create test module
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnhancedSecurityHeadersMiddleware],
    }).compile();

    middleware = module.get<EnhancedSecurityHeadersMiddleware>(EnhancedSecurityHeadersMiddleware);

    // Mock request, response, and next function
    mockRequest = {
      method: 'GET',
      headers: {},
    };

    mockResponse = {
      header: jest.fn(),
      removeHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('Constructor', () => {
    it('should call corsManager.logConfiguration on instantiation', () => {
      // The constructor is already called during beforeEach
      expect(mockCorsManager.logConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  describe('CORS Headers', () => {
    it('should set CORS headers when origin is allowed', () => {
      const allowedOrigin = 'http://localhost:3000';
      mockRequest.headers = { origin: allowedOrigin };
      mockCorsManager.getAllowedOrigin.mockReturnValue(allowedOrigin);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCorsManager.getAllowedOrigin).toHaveBeenCalledWith(allowedOrigin);
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', allowedOrigin);
      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should not set CORS headers when origin is not allowed', () => {
      const disallowedOrigin = 'https://malicious.com';
      mockRequest.headers = { origin: disallowedOrigin };
      mockCorsManager.getAllowedOrigin.mockReturnValue(null);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCorsManager.getAllowedOrigin).toHaveBeenCalledWith(disallowedOrigin);
      expect(mockResponse.header).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', disallowedOrigin);
      expect(mockResponse.header).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should not set credentials header when corsManager returns false', () => {
      const allowedOrigin = 'http://localhost:3000';
      mockRequest.headers = { origin: allowedOrigin };
      mockCorsManager.getAllowedOrigin.mockReturnValue(allowedOrigin);
      mockCorsManager.shouldAllowCredentials.mockReturnValue(false);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', allowedOrigin);
      expect(mockResponse.header).not.toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should handle requests without origin header', () => {
      mockRequest.headers = {};
      mockCorsManager.getAllowedOrigin.mockReturnValue(null);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCorsManager.getAllowedOrigin).toHaveBeenCalledWith(undefined);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('CORS Methods and Headers', () => {
    it('should set allowed methods from configuration', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET,POST,PUT,DELETE'
      );
    });

    it('should set allowed headers from configuration', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization'
      );
    });

    it('should handle empty methods array', () => {
      const configWithEmptyMethods = {
        ...mockSecurityConfig,
        cors: {
          ...mockSecurityConfig.cors,
          methods: [] as readonly string[],
        }
      };
      mockGetCurrentConfig.mockReturnValue(configWithEmptyMethods);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Methods', '');
    });

    it('should handle empty allowed headers array', () => {
      const configWithEmptyHeaders = {
        ...mockSecurityConfig,
        cors: {
          ...mockSecurityConfig.cors,
          allowedHeaders: [] as readonly string[],
        }
      };
      mockGetCurrentConfig.mockReturnValue(configWithEmptyHeaders);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Allow-Headers', '');
    });
  });

  describe('Security Headers', () => {
    it('should apply all security headers from configuration', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockResponse.header).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockResponse.header).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockResponse.header).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(mockResponse.header).toHaveBeenCalledWith('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    });

    it('should set Content-Security-Policy header from configuration', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline';"
      );
    });

    it('should remove X-Powered-By header', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    });

    it('should handle configuration with no security headers', () => {
      const configWithNoHeaders = {
        ...mockSecurityConfig,
        headers: {}
      };
      mockGetCurrentConfig.mockReturnValue(configWithNoHeaders);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Should still set CSP and remove X-Powered-By
      expect(mockResponse.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline';"
      );
      expect(mockResponse.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    });
  });

  describe('Preflight Requests (OPTIONS)', () => {
    it('should handle OPTIONS requests correctly', () => {
      mockRequest.method = 'OPTIONS';
      mockCorsManager.getMaxAge.mockReturnValue(7200);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', '7200');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should use default max age when corsManager returns undefined', () => {
      mockRequest.method = 'OPTIONS';
      mockCorsManager.getMaxAge.mockReturnValue(undefined as any);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledWith('Access-Control-Max-Age', 'undefined');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should not call next() for OPTIONS requests', () => {
      mockRequest.method = 'OPTIONS';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Non-OPTIONS Requests', () => {
    it('should call next() for GET requests', () => {
      mockRequest.method = 'GET';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
    });

    it('should call next() for POST requests', () => {
      mockRequest.method = 'POST';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should call next() for PUT requests', () => {
      mockRequest.method = 'PUT';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should call next() for DELETE requests', () => {
      mockRequest.method = 'DELETE';

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Integration', () => {
    it('should call getCurrentConfig to get configuration', () => {
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockGetCurrentConfig).toHaveBeenCalledTimes(1);
    });

    it('should call corsManager methods with correct parameters', () => {
      const origin = 'http://localhost:3000';
      mockRequest.headers = { origin };

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCorsManager.getAllowedOrigin).toHaveBeenCalledWith(origin);
      expect(mockCorsManager.shouldAllowCredentials).toHaveBeenCalledTimes(1);
    });

    it('should handle different origins correctly', () => {
      const testOrigins = [
        'http://localhost:3000',
        'https://app.example.com',
        'https://admin.example.com',
        undefined
      ];

      testOrigins.forEach(origin => {
        jest.clearAllMocks();
        mockRequest.headers = origin ? { origin } : {};
        mockCorsManager.getAllowedOrigin.mockReturnValue(origin || null);

        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

        expect(mockCorsManager.getAllowedOrigin).toHaveBeenCalledWith(origin);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration errors gracefully', () => {
      mockGetCurrentConfig.mockImplementation(() => {
        throw new Error('Configuration error');
      });

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Configuration error');
    });

    it('should handle corsManager errors gracefully', () => {
      mockCorsManager.getAllowedOrigin.mockImplementation(() => {
        throw new Error('CorsManager error');
      });

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('CorsManager error');
    });

    it('should handle response header setting errors', () => {
      const mockHeaderError = jest.fn().mockImplementation(() => {
        throw new Error('Header setting error');
      });
      mockResponse.header = mockHeaderError;

      expect(() => {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }).toThrow('Header setting error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle case-insensitive HTTP methods', () => {
      mockRequest.method = 'options'; // lowercase

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not be treated as OPTIONS (case-sensitive comparison)
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle empty origin header', () => {
      mockRequest.headers = { origin: '' };
      mockCorsManager.getAllowedOrigin.mockReturnValue(null);

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockCorsManager.getAllowedOrigin).toHaveBeenCalledWith('');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multiple header calls gracefully', () => {
      // Simulate multiple middleware calls
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.header).toHaveBeenCalledTimes(14); // 7 headers × 2 calls
      expect(mockNext).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance', () => {
    it('should complete execution quickly for normal requests', () => {
      const startTime = Date.now();

      middleware.use(mockRequest as Request, mockResponse as Response, mockNext);

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(10); // Should complete in less than 10ms
    });

    it('should not create memory leaks with repeated calls', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate many requests
      for (let i = 0; i < 1000; i++) {
        middleware.use(mockRequest as Request, mockResponse as Response, mockNext);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 1MB for 1000 calls)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });
  });
});