# Exception Filters in NestJS

## Overview

Exception filters in NestJS provide a centralized way to handle errors and exceptions throughout your application. They allow you to catch exceptions, format error responses, perform logging, and implement custom business logic for different types of errors.

## Table of Contents

1. [What are Exception Filters?](#what-are-exception-filters)
2. [Exception Filter Types](#exception-filter-types)
3. [Implementation Details](#implementation-details)
4. [Usage Examples](#usage-examples)
5. [Best Practices](#best-practices)
6. [Testing Exception Filters](#testing-exception-filters)

## What are Exception Filters?

Exception filters are classes that implement the `ExceptionFilter` interface and are decorated with the `@Catch()` decorator. They intercept exceptions thrown by your application and allow you to:

- **Format error responses** consistently
- **Log errors** with contextual information
- **Transform exceptions** into user-friendly messages
- **Implement security measures** to prevent information leakage
- **Add monitoring and alerting** capabilities

### Key Benefits

- **Centralized Error Handling**: Single place to manage how errors are processed
- **Consistent Response Format**: Uniform error structure across your API
- **Enhanced Logging**: Rich contextual information for debugging
- **Security**: Prevent sensitive information from being exposed
- **User Experience**: Transform technical errors into user-friendly messages

## Exception Filter Types

This project implements four specialized exception filters, each handling different categories of errors:

### 1. HTTP Exception Filter (`http-exception.filter.ts`)

**Purpose**: Handles standard NestJS HTTP exceptions like `BadRequestException`, `NotFoundException`, etc.

```typescript
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  // Handles: 400, 401, 403, 404, 500 HTTP status codes
  // Features: Request context logging, user-friendly messages
}
```

**When it's triggered**:
- `throw new BadRequestException('Invalid input')`
- `throw new NotFoundException('User not found')`
- `throw new UnauthorizedException('Access denied')`

**Response Format**:
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "User not found",
  "timestamp": "2025-11-18T10:30:00.000Z",
  "path": "/api/users/123",
  "requestId": "req-abc-123"
}
```

### 2. Validation Exception Filter (`validation-exception.filter.ts`)

**Purpose**: Handles class-validator validation errors with detailed field-level information.

```typescript
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  // Handles: DTO validation errors from class-validator
  // Features: Field-level error details, validation constraints
}
```

**When it's triggered**:
- Invalid DTO validation (missing required fields, wrong types, etc.)
- Custom validation decorators failing
- Transform pipe validation errors

**Response Format**:
```json
{
  "statusCode": 400,
  "error": "Validation Error",
  "message": "Validation failed",
  "validationErrors": [
    {
      "field": "email",
      "value": "invalid-email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    }
  ],
  "timestamp": "2025-11-18T10:30:00.000Z",
  "path": "/api/users",
  "requestId": "req-abc-123"
}
```

### 3. Custom Exception Filter (`custom-exception.filter.ts`)

**Purpose**: Handles business logic exceptions and domain-specific errors.

```typescript
@Catch(
  UnauthorizedException,
  ForbiddenException,
  TokenExpiredException,
  InvalidCredentialsException,
  InsufficientAccessLevelException,
  RateLimitExceededException,
)
export class CustomExceptionFilter implements ExceptionFilter {
  // Handles: Business logic errors with specific actions
  // Features: Security event logging, actionable error messages
}
```

**Custom Exception Classes**:
```typescript
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
```

**When it's triggered**:
- `throw new TokenExpiredException()`
- `throw new InvalidCredentialsException()`
- `throw new InsufficientAccessLevelException('ADMIN', 'STANDARD')`
- `throw new RateLimitExceededException(60)`

**Response Format**:
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "errorType": "TOKEN_EXPIRED",
  "message": "Token has expired",
  "timestamp": "2025-11-18T10:30:00.000Z",
  "path": "/api/secure-endpoint",
  "requestId": "req-abc-123",
  "action": "Please refresh your token and try again"
}
```

### 4. Global Exception Filter (`global-exception.filter.ts`)

**Purpose**: Catch-all filter for unexpected errors and system exceptions.

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  // Handles: Any unhandled exception
  // Features: Security information filtering, error ID generation
}
```

**When it's triggered**:
- Database connection errors
- Unhandled JavaScript errors
- Third-party service failures
- Any exception not caught by other filters

**Response Format**:
```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "errorId": "err-20231118-103000-abc123",
  "timestamp": "2025-11-18T10:30:00.000Z",
  "path": "/api/endpoint",
  "requestId": "req-abc-123",
  "support": "Please contact support with this error ID if the problem persists"
}
```

## Implementation Details

### Filter Registration Order

Exception filters are registered in a specific order in `main.ts`. The **most specific filters are registered first**, and the **most general filter (Global) is registered last**:

```typescript
app.useGlobalFilters(
  new ValidationExceptionFilter(),     // Most specific: validation errors
  new CustomExceptionFilter(),         // Business logic exceptions
  new HttpExceptionFilter(),           // Standard HTTP exceptions
  new GlobalExceptionFilter(),         // Catch-all: least specific
);
```

**Why this order matters**:
1. **Validation Filter** catches `BadRequestException` with validation details
2. **Custom Filter** catches business logic exceptions (auth, access control)
3. **HTTP Filter** catches remaining HTTP exceptions
4. **Global Filter** catches everything else

### Request Context Integration

All filters extract and log request context information:

```typescript
const requestId = request['requestId'] || 'unknown';
const userId = request['user']?.id || 'anonymous';
const ip = request.ip || request.connection?.remoteAddress || 'unknown';
const userAgent = request.get('User-Agent') || 'unknown';
```

This context is provided by the `RequestContextMiddleware` that runs before the filters.

### Security Considerations

1. **Information Filtering**: The Global filter removes stack traces and internal details
2. **Security Event Logging**: Authentication and authorization failures are specially logged
3. **Error IDs**: Unique identifiers for tracking without exposing system details
4. **Rate Limiting**: Custom handling for rate limit violations

## Usage Examples

### 1. Throwing Custom Exceptions in Services

```typescript
// security.service.ts
import { TokenExpiredException, InvalidCredentialsException } from '../filters/custom-exception.filter';

@Injectable()
export class SecurityService {
  async validateToken(token: string): Promise<any> {
    const user = this.validTokens.get(token);

    if (!user) {
      throw new InvalidCredentialsException('Invalid token provided');
    }

    const tokenAge = Date.now() - user.tokenIssuedAt.getTime();
    const maxTokenAge = 1000 * 60 * 60; // 1 hour

    if (tokenAge > maxTokenAge) {
      this.validTokens.delete(token);
      throw new TokenExpiredException('Your session has expired');
    }

    return user;
  }
}
```

### 2. Using in Guards

```typescript
// bearer-token.guard.ts
import { InsufficientAccessLevelException } from '../filters/custom-exception.filter';

@Injectable()
export class BearerTokenGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const user = await this.securityService.validateToken(token);
      
      if (!user) {
        throw new InvalidCredentialsException('Authentication required');
      }
      
      request.user = user;
      return true;
    } catch (error) {
      // Let the exception filters handle the error formatting
      throw error;
    }
  }
}
```

### 3. Controller Error Handling

```typescript
// catalog.controller.ts
import { TokenExpiredException } from '../filters/custom-exception.filter';

@Controller('catalog')
export class CatalogController {
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    const product = await this.catalogService.findById(id);
    
    if (!product) {
      // This will be caught by HttpExceptionFilter
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }
  
  @Post()
  @UseGuards(BearerTokenGuard)
  async createProduct(@Body() createProductDto: CreateProductDto) {
    // Validation errors will be caught by ValidationExceptionFilter
    // Authentication errors will be caught by CustomExceptionFilter
    return this.catalogService.create(createProductDto);
  }
}
```

## Best Practices

### 1. Exception Hierarchy

Organize your custom exceptions in a logical hierarchy:

```typescript
// Base custom exceptions
export abstract class BusinessLogicException extends Error {
  abstract readonly errorType: string;
  abstract readonly statusCode: number;
}

// Authentication related
export class AuthenticationException extends BusinessLogicException {
  readonly errorType = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
}

export class TokenExpiredException extends AuthenticationException {
  readonly errorType = 'TOKEN_EXPIRED';
}

// Authorization related
export class AuthorizationException extends BusinessLogicException {
  readonly errorType = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
}
```

### 2. Consistent Error Response Format

Maintain a consistent error response structure across all filters:

```typescript
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
  requestId: string;
  errorType?: string;        // For custom exceptions
  validationErrors?: any[];  // For validation exceptions
  errorId?: string;          // For global exceptions
  action?: string;           // User guidance
  support?: string;          // Support information
}
```

### 3. Logging Standards

Use consistent logging patterns across all filters:

```typescript
// Security events (auth/auth failures)
this.logger.warn(`SECURITY: ${errorType} [${requestId}] ${status} ${method} ${url} - User: ${userId} - IP: ${ip}`);

// Validation errors
this.logger.warn(`VALIDATION: ${errorType} [${requestId}] ${status} ${method} ${url} - Fields: ${failedFields}`);

// System errors
this.logger.error(`SYSTEM: ${errorType} [${requestId}] ${status} ${method} ${url} - Error: ${errorId}`);
```

### 4. Environment-Specific Behavior

Adjust filter behavior based on environment:

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  // Include stack trace and additional debug info
  errorResponse.stack = exception.stack;
  errorResponse.debug = { originalError: exception };
} else {
  // Production: minimal information
  errorResponse.errorId = this.generateErrorId();
  errorResponse.support = 'Contact support with this error ID';
}
```

### 5. Testing Exception Filters

Always test your exception filters with comprehensive test cases:

```typescript
describe('CustomExceptionFilter', () => {
  it('should handle TokenExpiredException', () => {
    const exception = new TokenExpiredException();
    // Test filter behavior
  });
  
  it('should log security events properly', () => {
    // Test logging functionality
  });
  
  it('should include request context in response', () => {
    // Test context extraction
  });
});
```

## Integration with Middleware

The exception filters work seamlessly with the existing middleware stack:

1. **Request Flow**: `Middleware → Guards → Controllers → Services`
2. **Exception Flow**: `Service Exception → Filters → Response`

The `RequestContextMiddleware` sets up the request context that filters use for logging and response formatting.

## Monitoring and Alerting

Exception filters provide excellent integration points for monitoring:

```typescript
// Add metrics collection
this.metricsService.incrementErrorCounter(errorType, status);

// Add alerting for critical errors
if (status >= 500) {
  this.alertingService.sendAlert({
    level: 'critical',
    message: `System error: ${errorType}`,
    requestId,
    errorId
  });
}
```

## Conclusion

Exception filters provide a robust foundation for error handling in NestJS applications. They enable:

- **Consistent error responses** across your API
- **Enhanced debugging** through contextual logging  
- **Better user experience** with meaningful error messages
- **Security** through controlled information exposure
- **Maintainability** through centralized error logic

The layered approach with specific filters for different error types ensures that each exception is handled appropriately while maintaining a clean separation of concerns.