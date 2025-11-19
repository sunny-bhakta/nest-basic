import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ResponseTransformInterceptor } from '../response.interceptor';

describe('ResponseTransformInterceptor', () => {
  let interceptor: ResponseTransformInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(async () => {
    interceptor = new ResponseTransformInterceptor();

    mockRequest = {
      method: 'GET',
      url: '/test',
      requestId: 'test-request-id',
      query: {},
    };

    mockResponse = {
      statusCode: 200,
    };

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: jest.fn(),
    };
  });

  describe('intercept', () => {
    it('should transform simple response to standard format', (done) => {
      const testData = { id: 1, name: 'Test' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(testData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (transformedResponse) => {
          expect(transformedResponse.success).toBe(true);
          expect(transformedResponse.data).toEqual(testData);
          expect(transformedResponse.metadata).toBeDefined();
          expect(transformedResponse.metadata.requestId).toBe('test-request-id');
          expect(transformedResponse.metadata.timestamp).toBeDefined();
          expect(transformedResponse.metadata.version).toBe('1.0.0');
          expect(transformedResponse.metadata.responseTime).toBeGreaterThanOrEqual(0);
          done();
        },
      });
    });

    it('should handle already transformed responses', (done) => {
      const alreadyTransformed = {
        success: true,
        data: { id: 1 },
        metadata: { requestId: 'existing' },
      };
      
      mockCallHandler.handle = jest.fn().mockReturnValue(of(alreadyTransformed));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response).toEqual(alreadyTransformed);
          done();
        },
      });
    });

    it('should handle array responses with pagination', (done) => {
      const arrayData = [{ id: 1 }, { id: 2 }, { id: 3 }];
      mockRequest.query = { page: '2', limit: '10' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(arrayData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toEqual(arrayData);
          expect(response.pagination).toBeDefined();
          expect(response.pagination.page).toBe(2);
          expect(response.pagination.limit).toBe(10);
          expect(response.pagination.total).toBe(3);
          expect(response.pagination.pages).toBe(1);
          done();
        },
      });
    });

    it('should handle null/undefined responses', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(null));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toBeNull();
          expect(response.metadata).toBeDefined();
          done();
        },
      });
    });

    it('should handle string responses', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('Hello World'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toBe('Hello World');
          expect(response.metadata).toBeDefined();
          done();
        },
      });
    });

    it('should handle number responses', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(42));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toBe(42);
          expect(response.metadata).toBeDefined();
          done();
        },
      });
    });

    it('should handle boolean responses', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of(true));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toBe(true);
          expect(response.metadata).toBeDefined();
          done();
        },
      });
    });

    it('should handle pagination with default values', (done) => {
      const arrayData = [1, 2, 3, 4, 5];
      mockRequest.query = {}; // No pagination params
      mockCallHandler.handle = jest.fn().mockReturnValue(of(arrayData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.pagination.page).toBe(1);
          expect(response.pagination.limit).toBe(10);
          expect(response.pagination.total).toBe(5);
          expect(response.pagination.pages).toBe(1);
          done();
        },
      });
    });

    it('should handle pagination with invalid query params', (done) => {
      const arrayData = [1, 2, 3];
      mockRequest.query = { page: 'invalid', limit: 'also-invalid' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(arrayData));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.pagination.page).toBe(1); // Default
          expect(response.pagination.limit).toBe(10); // Default
          done();
        },
      });
    });

    it('should handle missing request ID gracefully', (done) => {
      mockRequest.requestId = undefined;
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ test: 'data' }));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.metadata.requestId).toBe('unknown');
          done();
        },
      });
    });

    it('should include correct response time', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of('test'));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.metadata.responseTime).toBeGreaterThanOrEqual(0);
          expect(typeof response.metadata.responseTime).toBe('number');
          done();
        },
      });
    });

    it('should not add pagination for non-array responses', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of({ id: 1, name: 'Test' }));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.pagination).toBeUndefined();
          done();
        },
      });
    });

    it('should calculate pages correctly for pagination', (done) => {
      const largeArray = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
      mockRequest.query = { page: '2', limit: '10' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(largeArray));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.pagination.total).toBe(25);
          expect(response.pagination.pages).toBe(3); // Math.ceil(25/10)
          expect(response.pagination.page).toBe(2);
          expect(response.pagination.limit).toBe(10);
          done();
        },
      });
    });

    it('should handle empty arrays', (done) => {
      mockCallHandler.handle = jest.fn().mockReturnValue(of([]));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.success).toBe(true);
          expect(response.data).toEqual([]);
          expect(response.pagination).toBeDefined();
          expect(response.pagination.total).toBe(0);
          expect(response.pagination.pages).toBe(0);
          done();
        },
      });
    });

    it('should preserve existing success field when already transformed', (done) => {
      const alreadyTransformed = {
        success: false,
        data: null,
        message: 'Custom error',
      };
      
      mockCallHandler.handle = jest.fn().mockReturnValue(of(alreadyTransformed));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.success).toBe(false);
          expect(response.message).toBe('Custom error');
          done();
        },
      });
    });

    it('should handle responses with existing metadata', (done) => {
      const responseWithMetadata = {
        success: true,
        data: { test: 'data' },
        metadata: {
          customField: 'custom value',
        },
      };
      
      mockCallHandler.handle = jest.fn().mockReturnValue(of(responseWithMetadata));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response).toEqual(responseWithMetadata);
          expect(response.metadata.customField).toBe('custom value');
          done();
        },
      });
    });

    it('should not transform error responses', (done) => {
      const error = new Error('Test error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('response transformation edge cases', () => {
    it('should handle very large page numbers', (done) => {
      mockRequest.query = { page: '999999', limit: '10' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of([1, 2, 3]));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.pagination.page).toBe(999999);
          expect(response.pagination.pages).toBe(1); // Only 1 page for 3 items
          done();
        },
      });
    });

    it('should handle very large limit values', (done) => {
      mockRequest.query = { page: '1', limit: '999999' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of([1, 2, 3]));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          expect(response.pagination.limit).toBe(999999);
          expect(response.pagination.pages).toBe(1);
          done();
        },
      });
    });

    it('should handle negative page and limit values', (done) => {
      mockRequest.query = { page: '-1', limit: '-5' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of([1, 2, 3]));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          // Should fall back to defaults for invalid values
          expect(response.pagination.page).toBe(1);
          expect(response.pagination.limit).toBe(10);
          done();
        },
      });
    });

    it('should handle zero values in pagination', (done) => {
      mockRequest.query = { page: '0', limit: '0' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of([1, 2, 3]));

      const result = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result.subscribe({
        next: (response) => {
          // Should fall back to defaults for invalid values
          expect(response.pagination.page).toBe(1);
          expect(response.pagination.limit).toBe(10);
          done();
        },
      });
    });
  });
});