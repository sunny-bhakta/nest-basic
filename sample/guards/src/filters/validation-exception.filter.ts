import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get request context
    const requestId = request['requestId'] || 'unknown';
    const userId = request['user']?.id || 'anonymous';

    // Extract validation errors
    const exceptionResponse = exception.getResponse() as any;
    const isValidationError = Array.isArray(exceptionResponse.message);

    let errorResponse;

    if (isValidationError) {
      // Handle class-validator errors
      const validationErrors = this.formatValidationErrors(exceptionResponse.message);
      
      errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        error: 'Validation Failed',
        message: 'Input validation failed',
        validationErrors,
        requestId,
      };

      this.logger.warn(
        `Validation Error [${requestId}] ${request.method} ${request.url} - User: ${userId} - Errors: ${validationErrors.length} field(s)`
      );
    } else {
      // Handle other bad request errors
      errorResponse = {
        statusCode: status,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        error: 'Bad Request',
        message: exceptionResponse.message || exception.message,
        requestId,
      };

      this.logger.warn(
        `Bad Request [${requestId}] ${request.method} ${request.url} - User: ${userId} - ${errorResponse.message}`
      );
    }

    response.status(status).json(errorResponse);
  }

  private formatValidationErrors(validationMessages: string[]): any[] {
    return validationMessages.map(message => {
      // Parse validation messages to extract field and constraints
      // Example: "email must be an email" -> { field: "email", constraints: ["must be an email"] }
      
      const parts = message.split(' ');
      const field = parts[0];
      const constraint = parts.slice(1).join(' ');

      return {
        field,
        constraint,
        message,
      };
    });
  }
}