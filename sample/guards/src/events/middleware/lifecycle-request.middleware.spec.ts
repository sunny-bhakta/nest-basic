import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { LifecycleRequestMiddleware } from '../middleware/lifecycle-request.middleware';
import { LifecycleEventEmitter } from '../lifecycle-event-emitter.service';

interface MockRequest extends Request {
  requestId?: string;
  user?: any;
  session?: any;
}

describe('LifecycleRequestMiddleware', () => {
  let middleware: LifecycleRequestMiddleware;
  let mockEventEmitter: jest.Mocked<LifecycleEventEmitter>;
  let mockRequest: MockRequest;
  let mockResponse: Response;
  let mockNext: NextFunction;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LifecycleRequestMiddleware,
        {
          provide: LifecycleEventEmitter,
          useValue: {
            emitRequestStart: jest.fn().mockReturnValue(true),
            emitResponseEvent: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    middleware = module.get<LifecycleRequestMiddleware>(LifecycleRequestMiddleware);
    mockEventEmitter = module.get(LifecycleEventEmitter);

    mockRequest = {
      method: 'GET',
      url: '/api/users',
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'Mozilla/5.0',
        'content-type': 'application/json',
      },
      query: { page: '1' },
      route: { path: '/api/users' },
    } as MockRequest;

    mockResponse = {
      statusCode: 200,
      get: jest.fn().mockImplementation((header: string) => {
        if (header === 'content-length') return '1024';
        if (header === 'content-type') return 'application/json';
        return undefined;
      }),
      on: jest.fn(),
    } as any;

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Middleware Processing', () => {
    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should generate request ID and emit request start event', () => {
      middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockRequest.requestId).toBeDefined();
      expect(mockRequest.requestId).toMatch(/^req-\d+-[a-z0-9]+$/);
      
      expect(mockEventEmitter.emitRequestStart).toHaveBeenCalledWith({
        requestId: mockRequest.requestId,
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        method: 'GET',
        url: '/api/users',
        headers: expect.objectContaining({
          'user-agent': 'Mozilla/5.0',
          'content-type': 'application/json',
        }),
        query: { page: '1' },
        route: '/api/users',
      });

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle requests with user context', () => {
      mockRequest.user = {
        id: 'user-456',
        username: 'john',
        role: 'USER',
      };

      middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockEventEmitter.emitRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-456',
        })
      );
    });

    it('should handle requests with session context', () => {
      mockRequest.session = {
        id: 'session-789',
        data: { theme: 'dark' },
      };

      middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockEventEmitter.emitRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-789',
        })
      );
    });

    it('should emit response event when response finishes', () => {
      const startTime = Date.now();
      
      middleware.use(mockRequest, mockResponse, mockNext);

      // Simulate response finish event
      const finishCallback = (mockResponse.on as jest.Mock).mock.calls
        .find(call => call[0] === 'finish')?.[1];

      expect(finishCallback).toBeDefined();

      // Mock Date.now to control duration calculation
      const mockDateNow = jest.spyOn(Date, 'now')
        .mockReturnValue(startTime + 150);

      finishCallback();

      expect(mockEventEmitter.emitResponseEvent).toHaveBeenCalledWith({
        requestId: mockRequest.requestId,
        ip: '192.168.1.1',
        statusCode: 200,
        contentType: 'application/json',
        contentLength: 1024,
        duration: 150,
      });

      mockDateNow.mockRestore();
    });

    it('should handle responses without content-length header', () => {
      (mockResponse.get as jest.Mock).mockImplementation((header: string) => {
        if (header === 'content-type') return 'application/json';
        return undefined;
      });

      middleware.use(mockRequest, mockResponse, mockNext);

      const finishCallback = (mockResponse.on as jest.Mock).mock.calls
        .find(call => call[0] === 'finish')?.[1];

      finishCallback();

      expect(mockEventEmitter.emitResponseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          contentLength: 0,
        })
      );
    });

    it('should sanitize sensitive headers', () => {
      mockRequest.headers = {
        'authorization': 'Bearer secret-token',
        'cookie': 'session=abc123',
        'x-api-key': 'api-key-456',
        'content-type': 'application/json',
        'user-agent': 'Mozilla/5.0',
      };

      middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockEventEmitter.emitRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'authorization': '[REDACTED]',
            'cookie': '[REDACTED]',
            'x-api-key': '[REDACTED]',
            'content-type': 'application/json',
            'user-agent': 'Mozilla/5.0',
          }),
        })
      );
    });

    it('should handle missing headers gracefully', () => {
      mockRequest.headers = {};
      
      middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockEventEmitter.emitRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'Unknown',
          headers: {},
        })
      );
    });

    it('should handle missing route gracefully', () => {
      delete mockRequest.route;
      
      middleware.use(mockRequest, mockResponse, mockNext);

      expect(mockEventEmitter.emitRequestStart).toHaveBeenCalledWith(
        expect.objectContaining({
          route: undefined,
        })
      );
    });

    it('should generate unique request IDs for multiple requests', () => {
      const request1 = { ...mockRequest };
      const request2 = { ...mockRequest };

      middleware.use(request1, mockResponse, mockNext);
      middleware.use(request2, mockResponse, mockNext);

      expect(request1.requestId).toBeDefined();
      expect(request2.requestId).toBeDefined();
      expect(request1.requestId).not.toBe(request2.requestId);
    });

    it('should handle event emission errors gracefully', () => {
      mockEventEmitter.emitRequestStart.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      expect(() => {
        middleware.use(mockRequest, mockResponse, mockNext);
      }).not.toThrow();

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Request ID Generation', () => {
    it('should generate request ID in correct format', () => {
      middleware.use(mockRequest, mockResponse, mockNext);
      
      expect(mockRequest.requestId).toMatch(/^req-\d+-[a-z0-9]+$/);
    });

    it('should not override existing request ID', () => {
      mockRequest.requestId = 'existing-req-id';
      
      middleware.use(mockRequest, mockResponse, mockNext);
      
      expect(mockRequest.requestId).toBe('existing-req-id');
    });
  });

  describe('Response Timing', () => {
    it('should calculate response duration correctly', () => {
      const startTime = Date.now();
      const mockDateNow = jest.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 250);

      middleware.use(mockRequest, mockResponse, mockNext);

      const finishCallback = (mockResponse.on as jest.Mock).mock.calls
        .find(call => call[0] === 'finish')?.[1];

      finishCallback();

      expect(mockEventEmitter.emitResponseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 250,
        })
      );

      mockDateNow.mockRestore();
    });
  });
});