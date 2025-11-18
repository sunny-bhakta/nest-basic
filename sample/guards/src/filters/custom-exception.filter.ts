import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Custom exceptions for business logic
export class TokenExpiredException extends UnauthorizedException {
  constructor(message = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredException';
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor(message = 'Invalid credentials provided') {
    super(message);
    this.name = 'InvalidCredentialsException';
  }
}

export class InsufficientAccessLevelException extends ForbiddenException {
  constructor(required: string, current: string) {
    super(`Access denied. Required: ${required}, Current: ${current}`);
    this.name = 'InsufficientAccessLevelException';
  }
}

export class RateLimitExceededException extends Error {
  constructor(retryAfter: number) {
    super(`Rate limit exceeded. Try again in ${retryAfter} seconds`);
    this.name = 'RateLimitExceededException';
  }
}

@Catch(
  UnauthorizedException,
  ForbiddenException,
  TokenExpiredException,
  InvalidCredentialsException,
  InsufficientAccessLevelException,
  RateLimitExceededException,
)
export class CustomExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CustomExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get request context
    const requestId = request['requestId'] || 'unknown';
    const userId = request['user']?.id || 'anonymous';
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const userAgent = request.get('User-Agent') || 'unknown';

    let status: number;
    let errorType: string;
    let message: string;
    let errorResponse: any;

    if (exception instanceof TokenExpiredException) {
      status = 401;
      errorType = 'TOKEN_EXPIRED';
      message = exception.message;
      errorResponse = {
        statusCode: status,
        error: 'Unauthorized',
        errorType,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        action: 'Please refresh your token and try again',
      };
    } else if (exception instanceof InvalidCredentialsException) {
      status = 401;
      errorType = 'INVALID_CREDENTIALS';
      message = exception.message;
      errorResponse = {
        statusCode: status,
        error: 'Unauthorized',
        errorType,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        action: 'Please check your credentials and try again',
      };
    } else if (exception instanceof InsufficientAccessLevelException) {
      status = 403;
      errorType = 'INSUFFICIENT_ACCESS_LEVEL';
      message = exception.message;
      errorResponse = {
        statusCode: status,
        error: 'Forbidden',
        errorType,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        action: 'Contact your administrator to upgrade your access level',
      };
    } else if (exception instanceof RateLimitExceededException) {
      status = 429;
      errorType = 'RATE_LIMIT_EXCEEDED';
      message = exception.message;
      errorResponse = {
        statusCode: status,
        error: 'Too Many Requests',
        errorType,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
        action: 'Please wait and try again later',
      };
    } else if (exception instanceof UnauthorizedException) {
      status = 401;
      errorType = 'UNAUTHORIZED';
      message = exception.message;
      errorResponse = {
        statusCode: status,
        error: 'Unauthorized',
        errorType,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      };
    } else if (exception instanceof ForbiddenException) {
      status = 403;
      errorType = 'FORBIDDEN';
      message = exception.message;
      errorResponse = {
        statusCode: status,
        error: 'Forbidden',
        errorType,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      };
    } else {
      // Fallback for unknown custom exceptions
      status = 500;
      errorType = 'UNKNOWN_CUSTOM_ERROR';
      message = exception.message || 'Unknown error occurred';
      errorResponse = {
        statusCode: status,
        error: 'Internal Server Error',
        errorType,
        message,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      };
    }

    // Enhanced logging for security events
    const logMessage = `${errorType} [${requestId}] ${status} ${request.method} ${request.url} - User: ${userId} - IP: ${ip} - UserAgent: ${userAgent}`;
    
    if (status === 401 || status === 403) {
      // Security-related errors get special attention
      this.logger.warn(`SECURITY: ${logMessage}`);
    } else {
      this.logger.warn(logMessage);
    }

    response.status(status).json(errorResponse);
  }
}