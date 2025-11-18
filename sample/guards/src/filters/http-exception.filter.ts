import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get request context for logging
    const requestId = request['requestId'] || 'unknown';
    const userId = request['user']?.id || 'anonymous';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';

    // Extract error details
    const exceptionResponse = exception.getResponse();
    const errorMessage = typeof exceptionResponse === 'string' 
      ? exceptionResponse 
      : (exceptionResponse as any).message || exception.message;

    // Create standardized error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
      error: HttpStatus[status] || 'Unknown Error',
      requestId,
      ...(typeof exceptionResponse === 'object' && exceptionResponse !== null 
        ? { details: exceptionResponse } 
        : {}),
    };

    // Log the error with context
    const logMessage = `HTTP Exception [${requestId}] ${status} ${request.method} ${request.url} - User: ${userId} - IP: ${ip} - Error: ${errorMessage}`;
    
    if (status >= 500) {
      this.logger.error(logMessage, exception.stack);
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    } else {
      this.logger.log(logMessage);
    }

    // Send response
    response.status(status).json(errorResponse);
  }
}