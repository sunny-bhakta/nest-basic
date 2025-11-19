import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ValidationExceptionFilter } from './validation-exception.filter';

describe('ValidationExceptionFilter', () => {
  let filter: ValidationExceptionFilter;
  let mockArgumentsHost: ArgumentsHost;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationExceptionFilter],
    }).compile();

    filter = module.get<ValidationExceptionFilter>(ValidationExceptionFilter);

    // Mock request object
    mockRequest = {
      url: '/api/users',
      method: 'POST',
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

  describe('catch method', () => {
    it('should handle validation errors with detailed field information', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['email must be an email', 'age must be a number'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/api/users',
        method: 'POST',
        error: 'Validation Failed',
        message: 'Input validation failed',
        validationErrors: [
          {
            field: 'email',
            constraint: 'must be an email',
            message: 'email must be an email',
          },
          {
            field: 'age',
            constraint: 'must be a number',
            message: 'age must be a number',
          },
        ],
        requestId: 'unknown',
      });
    });

    it('should handle validation errors with array messages', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: [
          'name should not be empty',
          'email must be an email',
          'password must be longer than or equal to 8 characters',
        ],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.validationErrors).toHaveLength(3);
      expect(responseCall.validationErrors[0].field).toBe('name');
      expect(responseCall.validationErrors[1].field).toBe('email');
      expect(responseCall.validationErrors[2].field).toBe('password');
    });

    it('should handle non-validation BadRequestException', () => {
      const exception = new BadRequestException('Simple bad request');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        timestamp: expect.any(String),
        path: '/api/users',
        method: 'POST',
        error: 'Bad Request',
        message: 'Simple bad request',
        requestId: 'unknown',
      });
    });

    it('should handle validation errors with single message', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['field1 is required'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.validationErrors).toEqual([
        {
          field: 'field1',
          constraint: 'is required',
          message: 'field1 is required',
        },
      ]);
    });
  });

  describe('request context handling', () => {
    it('should extract request context with requestId and user', () => {
      mockRequest['requestId'] = 'req-validation-123';
      mockRequest['user'] = { id: 'user-456' };

      const exception = new BadRequestException({
        statusCode: 400,
        message: ['validation error'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-validation-123',
        })
      );
    });

    it('should handle missing request context gracefully', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['validation error'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'unknown',
        })
      );
    });
  });

  describe('logging behavior', () => {
    it('should log validation errors with field count', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['email must be an email', 'password too short'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'Validation Error [unknown] POST /api/users - User: anonymous - Errors: 2 field(s)'
      );
    });

    it('should log validation errors with request context', () => {
      mockRequest['requestId'] = 'req-val-789';
      mockRequest['user'] = { id: 'user-123' };

      const exception = new BadRequestException({
        statusCode: 400,
        message: ['name is required'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'Validation Error [req-val-789] POST /api/users - User: user-123 - Errors: 1 field(s)'
      );
    });

    it('should log non-validation bad request errors', () => {
      const exception = new BadRequestException('Simple bad request');

      filter.catch(exception, mockArgumentsHost);

      expect(filter['logger'].warn).toHaveBeenCalledWith(
        'Bad Request [unknown] POST /api/users - User: anonymous - Simple bad request'
      );
    });
  });

  describe('private method testing', () => {
    describe('formatValidationErrors', () => {
      it('should format validation messages correctly', () => {
        const validationMessages = [
          'email must be an email',
          'password must be longer than 8 characters',
          'name should not be empty',
        ];

        const result = (filter as any).formatValidationErrors(validationMessages);
        
        expect(result).toEqual([
          {
            field: 'email',
            constraint: 'must be an email',
            message: 'email must be an email',
          },
          {
            field: 'password',
            constraint: 'must be longer than 8 characters',
            message: 'password must be longer than 8 characters',
          },
          {
            field: 'name',
            constraint: 'should not be empty',
            message: 'name should not be empty',
          },
        ]);
      });

      it('should handle single word messages', () => {
        const validationMessages = ['required'];

        const result = (filter as any).formatValidationErrors(validationMessages);
        
        expect(result).toEqual([
          {
            field: 'required',
            constraint: '',
            message: 'required',
          },
        ]);
      });

      it('should handle empty messages array', () => {
        const validationMessages: string[] = [];

        const result = (filter as any).formatValidationErrors(validationMessages);
        
        expect(result).toEqual([]);
      });
    });
  });

  describe('response format', () => {
    it('should include all required fields in validation response', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['validation error'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).toEqual({
        statusCode: 400,
        timestamp: expect.any(String),
        path: expect.any(String),
        method: expect.any(String),
        error: 'Validation Failed',
        message: 'Input validation failed',
        validationErrors: expect.any(Array),
        requestId: expect.any(String),
      });
    });

    it('should include all required fields in bad request response', () => {
      const exception = new BadRequestException('Simple bad request');

      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall).toEqual({
        statusCode: 400,
        timestamp: expect.any(String),
        path: expect.any(String),
        method: expect.any(String),
        error: 'Bad Request',
        message: 'Simple bad request',
        requestId: expect.any(String),
      });
    });

    it('should format timestamp as ISO string', () => {
      const exception = new BadRequestException({
        statusCode: 400,
        message: ['validation error'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockArgumentsHost);

      const responseCall = (mockResponse.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});