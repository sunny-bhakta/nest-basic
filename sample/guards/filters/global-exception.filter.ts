import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get request context
    const requestId = request['requestId'] || 'unknown';
    const userId = request['user']?.id || 'anonymous';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      // This should be handled by HttpExceptionFilter, but just in case
      status = exception.getStatus();
      message = exception.message;
      error = HttpStatus[status] || 'Http Exception';
    } else if (exception instanceof Error) {
      // Unhandled application errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
      
      // Log the full error for debugging (but don't expose to client)
      this.logger.error(
        `Unhandled Error [${requestId}] ${request.method} ${request.url} - User: ${userId} - IP: ${ip}`,
        exception.stack
      );
    } else {
      // Unknown error types
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Unknown Error';
      
      this.logger.error(
        `Unknown Exception [${requestId}] ${request.method} ${request.url} - User: ${userId} - IP: ${ip}`,
        String(exception)
      );
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
      requestId,
      // Only include environment info in development
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          originalError: exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      }),
    };

    // Log error summary
    this.logger.error(
      `Global Exception [${requestId}] ${status} ${request.method} ${request.url} - User: ${userId} - IP: ${ip} - ${message}`
    );

    response.status(status).json(errorResponse);
  }
}