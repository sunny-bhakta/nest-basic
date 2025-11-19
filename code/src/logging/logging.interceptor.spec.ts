import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    mockContext = {} as ExecutionContext;
    mockCallHandler = {
      handle: jest.fn(() => of('test-data')),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log before and after handling', (done) => {
    const beforeSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    interceptor.intercept(mockContext, mockCallHandler).subscribe(() => {
      expect(beforeSpy).toHaveBeenCalledWith('******LoggingInterceptor Before...');
      expect(beforeSpy).toHaveBeenCalledWith(' *****LoggingInterceptor After...');
      beforeSpy.mockRestore();
      done();
    });
  });

  it('should call next.handle and return its observable', (done) => {
    interceptor.intercept(mockContext, mockCallHandler).subscribe((data) => {
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(data).toBe('test-data');
      done();
    });
  });
});
