# Pipes in NestJS

## Overview

Pipes in NestJS are powerful tools that transform and validate incoming data before it reaches your route handlers. They operate at the intersection between the client request and your business logic, ensuring that your controllers receive clean, validated, and properly typed data.

## Table of Contents

1. [What are Pipes?](#what-are-pipes)
2. [Pipe Types and Architecture](#pipe-types-and-architecture)
3. [Implementation Details](#implementation-details)
4. [Usage Examples](#usage-examples)
5. [Integration with Project Architecture](#integration-with-project-architecture)
6. [Security Considerations](#security-considerations)
7. [Best Practices](#best-practices)

## What are Pipes?

Pipes are classes decorated with the `@Injectable()` decorator and implement the `PipeTransform` interface. They serve two primary purposes:

### **Transformation**
- Convert input data from one type to another
- Format and sanitize user input
- Parse strings to numbers, booleans, arrays, etc.

### **Validation**
- Validate input data against predefined rules
- Ensure data meets business requirements
- Prevent invalid data from reaching controllers

### Key Benefits

- **Data Integrity**: Ensure only valid data reaches your business logic
- **Type Safety**: Convert and validate data types at runtime
- **Security**: Prevent injection attacks and malicious input
- **Consistency**: Standardized validation across your application
- **Reusability**: Same pipe can be used across multiple endpoints

## Request Processing Flow

```
HTTP Request
     ↓
Middleware (CORS, Logging, Rate Limiting)
     ↓
Guards (Authentication, Authorization)  
     ↓
**PIPES** (Validation, Transformation, Sanitization) ← YOU ARE HERE
     ↓
Controllers (Business Logic)
     ↓
Services (Data Processing)
     ↓
Exception Filters (Error Handling)
     ↓
HTTP Response
```

## Pipe Types and Architecture

This project implements three categories of pipes, each serving specific purposes:

### 1. Validation Pipes (`validation.pipe.ts`)

**Purpose**: Comprehensive input validation using class-validator decorators and DTOs.

#### ValidationPipe
```typescript
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata): Promise<any> {
    // Transforms plain objects to class instances
    // Validates using class-validator decorators
    // Provides detailed error messages
  }
}
```

**Features**:
- **DTO Integration**: Works with class-validator decorators
- **Detailed Errors**: Provides field-level validation messages
- **Whitelist Mode**: Strips unknown properties
- **Transform Mode**: Converts types automatically
- **Nested Validation**: Supports complex object validation

**When to Use**:
- Request body validation (POST, PUT, PATCH)
- Complex object validation with nested properties
- When you need detailed field-level error messages

#### StrictValidationPipe
```typescript
@Injectable() 
export class StrictValidationPipe implements PipeTransform<any> {
  // Even stricter validation
  // Removes all non-whitelisted properties
  // Zero tolerance for invalid data
}
```

**Features**:
- **Zero Tolerance**: Fails on any validation error
- **Property Exclusion**: Only allows @Expose() decorated properties
- **Security First**: Prevents property pollution attacks

### 2. Transform Pipes (`transform.pipe.ts`)

**Purpose**: Data type conversion and formatting for primitive types and simple validations.

#### ParseIntPipe
```typescript
@Injectable()
export class ParseIntPipe implements PipeTransform<string, number | undefined> {
  constructor(private readonly options: {
    optional?: boolean;
    min?: number;
    max?: number;
    errorMessage?: string;
  } = {}) {}

  transform(value: string, metadata: ArgumentMetadata): number | undefined {
    // Converts string to integer with range validation
  }
}
```

**Usage Examples**:
```typescript
// Path parameters
@Get('users/:id')
getUser(@Param('id', new ParseIntPipe({ min: 1, max: 999999 })) id: number) {
  // id is guaranteed to be a number between 1 and 999999
}

// Query parameters
@Get('items')
getItems(@Query('page', new ParseIntPipe({ optional: true, min: 1 })) page?: number) {
  // page is optional but if provided, must be >= 1
}
```

#### ParseUUIDPipe
```typescript
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string | undefined> {
  constructor(private readonly options: {
    optional?: boolean;
    version?: '3' | '4' | '5';
    errorMessage?: string;
  } = {}) {}
}
```

**Usage Examples**:
```typescript
@Get('users/:userId')
getUser(@Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string) {
  // userId is guaranteed to be a valid UUID v4
}

@Delete('users/:id')
deleteUser(@Param('id', new ParseUUIDPipe()) id: string) {
  // id is guaranteed to be a valid UUID (any version)
}
```

#### TrimPipe
```typescript
@Injectable()
export class TrimPipe implements PipeTransform<string, string | null | undefined> {
  constructor(private readonly options: {
    transformEmpty?: 'null' | 'undefined' | 'keep';
    maxLength?: number;
    minLength?: number;
    toLowerCase?: boolean;
    toUpperCase?: boolean;
  } = {}) {}
}
```

**Usage Examples**:
```typescript
@Get('search')
search(
  @Query('q', new TrimPipe({ 
    toLowerCase: true, 
    maxLength: 100,
    transformEmpty: 'null' 
  })) 
  query?: string
) {
  // query is trimmed, lowercase, max 100 chars, empty strings become null
}
```

#### ParseArrayPipe
```typescript
@Injectable()
export class ParseArrayPipe implements PipeTransform<string, any[] | undefined> {
  constructor(private readonly options: {
    separator?: string;
    itemType?: 'string' | 'number' | 'boolean';
    unique?: boolean;
    maxItems?: number;
    minItems?: number;
    optional?: boolean;
  } = {}) {}
}
```

**Usage Examples**:
```typescript
@Get('items')
getItems(
  @Query('categories', new ParseArrayPipe({
    separator: ',',
    itemType: 'string',
    maxItems: 5,
    unique: true
  }))
  categories?: string[]
) {
  // ?categories=electronics,books,toys
  // Result: ['electronics', 'books', 'toys']
}

@Get('products')
getProducts(
  @Query('ids', new ParseArrayPipe({
    itemType: 'number',
    minItems: 1,
    maxItems: 10
  }))
  ids: number[]
) {
  // ?ids=1,2,3,4,5
  // Result: [1, 2, 3, 4, 5] (as numbers)
}
```

### 3. Business Logic Pipes (`business.pipe.ts`)

**Purpose**: Domain-specific validation and processing that aligns with your business rules.

#### AccessLevelValidationPipe
```typescript
@Injectable()
export class AccessLevelValidationPipe implements PipeTransform<string, AccessLevel> {
  constructor(private readonly options: {
    allowedLevels?: AccessLevel[];
    minimumLevel?: AccessLevel;
    errorMessage?: string;
  } = {}) {}
}
```

**Usage Examples**:
```typescript
@Post('admin/promote-user')
@SecureEndpoint(AccessLevel.ADMIN)
promoteUser(
  @Query('level', new AccessLevelValidationPipe({
    allowedLevels: [AccessLevel.PREMIUM, AccessLevel.ADMIN],
    minimumLevel: AccessLevel.PREMIUM
  }))
  targetLevel: AccessLevel
) {
  // Only allows PREMIUM or ADMIN levels, enforces minimum PREMIUM
}
```

**Integration with Guards**: 
- Works seamlessly with your existing `BearerTokenGuard` and `UserAccessGuard`
- Validates access level parameters before they reach the guard logic
- Provides early validation feedback

#### SecuritySanitizationPipe
```typescript
@Injectable()
export class SecuritySanitizationPipe implements PipeTransform<any, any> {
  constructor(private readonly options: {
    allowHtml?: boolean;
    maxLength?: number;
    preventSqlInjection?: boolean;
    preventXss?: boolean;
    preventScriptInjection?: boolean;
    customBlacklist?: string[];
  } = {}) {}
}
```

**Security Features**:
- **SQL Injection Prevention**: Detects SQL keywords and patterns
- **XSS Protection**: Identifies and blocks script tags and event handlers
- **Script Injection Detection**: Prevents eval(), setTimeout() and similar
- **Custom Blacklists**: Block specific terms or patterns
- **HTML Sanitization**: Escapes dangerous HTML characters

**Usage Examples**:
```typescript
@Post('comments')
createComment(
  @Body('content', new SecuritySanitizationPipe({
    maxLength: 1000,
    preventXss: true,
    preventSqlInjection: true,
    customBlacklist: ['spam', 'advertisement']
  }))
  content: string
) {
  // content is guaranteed to be safe from common attacks
}

@Get('search')
search(
  @Query('q', new SecuritySanitizationPipe({
    maxLength: 100,
    preventSqlInjection: true,
    preventXss: true
  }))
  searchTerm: string
) {
  // searchTerm is sanitized and safe for database queries
}
```

#### PaginationPipe
```typescript
@Injectable()
export class PaginationPipe implements PipeTransform<any, any> {
  constructor(private readonly options: {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
    minLimit?: number;
  } = {}) {}

  transform(value: any, metadata: ArgumentMetadata): { 
    page: number; 
    limit: number; 
    offset: number 
  } {
    // Returns standardized pagination object
  }
}
```

**Usage Examples**:
```typescript
@Get('users')
getUsers(
  @Query('page', new ParseIntPipe({ optional: true, min: 1 })) page?: number,
  @Query('limit', new ParseIntPipe({ optional: true, min: 1, max: 100 })) limit?: number
) {
  const paginationParams = { page: page || 1, limit: limit || 10 };
  const pagination = new PaginationPipe({
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100
  }).transform(paginationParams, { data: 'pagination' } as any);

  // pagination = { page: 1, limit: 10, offset: 0 }
  return this.userService.findMany(pagination);
}
```

#### SearchValidationPipe
```typescript
@Injectable()
export class SearchValidationPipe implements PipeTransform<any, any> {
  constructor(private readonly options: {
    minLength?: number;
    maxLength?: number;
    allowedFields?: string[];
    allowedOperators?: string[];
    preventInjection?: boolean;
  } = {}) {}
}
```

**Usage Examples**:
```typescript
@Get('advanced-search')
advancedSearch(
  @Query('search', new SearchValidationPipe({
    minLength: 2,
    maxLength: 200,
    allowedFields: ['name', 'email', 'description'],
    allowedOperators: ['contains', 'equals', 'startsWith'],
    preventInjection: true
  }))
  searchParams: any
) {
  // Handles both simple string searches and complex search objects
  // Example: ?search={"name": {"operator": "contains", "value": "john"}}
}
```

## Implementation Details

### Pipe Configuration and Options

Each pipe accepts a configuration object that allows fine-tuning of behavior:

```typescript
// Basic usage
@Param('id', new ParseIntPipe()) id: number

// With options
@Param('id', new ParseIntPipe({
  optional: false,
  min: 1,
  max: 999999,
  errorMessage: 'User ID must be between 1 and 999999'
})) id: number
```

### Error Handling Integration

Pipes integrate seamlessly with your exception filter system:

```typescript
// Pipe throws BadRequestException
throw new BadRequestException('Invalid UUID format');

// Exception flows through your filter chain:
// 1. ValidationExceptionFilter (for validation errors)
// 2. HttpExceptionFilter (for HTTP exceptions)  
// 3. GlobalExceptionFilter (catch-all)
```

### Metadata and Context

Pipes receive metadata about the parameter being validated:

```typescript
transform(value: any, metadata: ArgumentMetadata): any {
  // metadata.type: 'body' | 'query' | 'param' | 'custom'
  // metadata.metatype: The TypeScript type (String, Number, etc.)
  // metadata.data: Parameter name ('id', 'email', etc.)
}
```

## Usage Examples

### Basic Parameter Validation

```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  getUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('include', new ParseArrayPipe({ 
      optional: true, 
      itemType: 'string',
      maxItems: 5 
    })) include?: string[]
  ) {
    // id is guaranteed to be a valid UUID
    // include is an optional array of strings (max 5 items)
  }
}
```

### Complex Body Validation

```typescript
@Controller('users')
export class UsersController {
  @Post()
  @UsePipes(new ValidationPipe()) // Apply to entire request body
  createUser(@Body() createUserDto: CreateUserDto) {
    // createUserDto is fully validated according to class-validator decorators
  }

  @Put(':id')
  updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new StrictValidationPipe()) updateDto: UpdateUserDto
  ) {
    // id is validated UUID, updateDto is strictly validated
  }
}
```

### Search and Pagination

```typescript
@Controller('catalog')
export class CatalogController {
  @Get('search')
  search(
    @Query('q', new SecuritySanitizationPipe({ 
      maxLength: 100, 
      preventXss: true 
    })) searchTerm?: string,
    
    @Query('category', new TrimPipe({ 
      toLowerCase: true, 
      maxLength: 50 
    })) category?: string,
    
    @Query('page', new ParseIntPipe({ 
      optional: true, 
      min: 1, 
      max: 10000 
    })) page?: number,
    
    @Query('tags', new ParseArrayPipe({ 
      separator: ',', 
      itemType: 'string', 
      maxItems: 5 
    })) tags?: string[]
  ) {
    // All parameters are validated, sanitized, and properly typed
    const paginationParams = { page: page || 1, limit: 10 };
    const pagination = new PaginationPipe().transform(
      paginationParams, 
      { data: 'pagination' } as any
    );
    
    return this.catalogService.search({
      searchTerm,
      category, 
      tags,
      pagination
    });
  }
}
```

### Security-Focused Validation

```typescript
@Controller('admin')
@SecureEndpoint(AccessLevel.ADMIN)
export class AdminController {
  @Post('bulk-action')
  bulkAction(
    @Query('ids', new ParseArrayPipe({
      itemType: 'string',
      minItems: 1,
      maxItems: 50
    })) userIds: string[],
    
    @Query('action', new TrimPipe({
      toLowerCase: true
    })) action: string,
    
    @Query('accessLevel', new AccessLevelValidationPipe({
      allowedLevels: [AccessLevel.STANDARD, AccessLevel.PREMIUM]
    })) targetLevel?: AccessLevel
  ) {
    // Validate each ID is a proper UUID
    const validatedIds = userIds.map(id => 
      new ParseUUIDPipe().transform(id, { data: 'id' } as any)
    );
    
    return this.adminService.bulkAction(validatedIds, action, targetLevel);
  }
}
```

## Integration with Project Architecture

### Middleware Integration

Pipes work after middleware but receive the enriched request context:

```typescript
// RequestContextMiddleware adds requestId
// SecurityHeadersMiddleware adds security headers
// LoggingMiddleware logs the request

// Pipes can access this context:
transform(value: any, metadata: ArgumentMetadata): any {
  const request = getCurrentRequest(); // Custom helper
  const requestId = request['requestId'];
  const userId = request['user']?.id;
  
  // Use context for logging and validation
}
```

### Guard Integration

Pipes validate parameters that guards might use:

```typescript
@Get('admin/:userId') 
@SecureEndpoint(AccessLevel.ADMIN)
adminAction(
  @Param('userId', new ParseUUIDPipe()) userId: string
  // ↑ Pipe ensures valid UUID before guard checks access
) {
  // Guards receive validated parameters
}
```

### Exception Filter Integration

Pipe validation errors flow through your filter system:

```typescript
// Pipe validation fails
throw new BadRequestException({
  statusCode: 400,
  message: ['email must be an email', 'age must be a number'],
  error: 'Bad Request'
});

// ValidationExceptionFilter catches and formats the error
// Result: Detailed field-level error response
```

### Service Integration

Services receive clean, validated data:

```typescript
@Injectable()
export class UserService {
  createUser(userData: CreateUserDto) {
    // userData is guaranteed to be valid
    // No need for additional validation in service layer
    // Focus on business logic, not data validation
  }
}
```

## Security Considerations

### Input Sanitization

The `SecuritySanitizationPipe` provides multiple layers of protection:

```typescript
// SQL Injection Prevention
const sqlPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
  /('|(\\')|(;)|(--)|(\/\*)|(\*\/)|(\|)|(%7C))/i,
];

// XSS Prevention
const xssPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

// Script Injection Prevention  
const scriptPatterns = [
  /eval\s*\(/gi,
  /setTimeout\s*\(/gi,
  /Function\s*\(/gi,
];
```

### Property Pollution Prevention

```typescript
// Dangerous property names blocked
const dangerousNames = [
  '__proto__',
  'constructor', 
  'prototype',
  'toString',
  'valueOf'
];
```

### Access Control Integration

```typescript
@Injectable()
export class AccessLevelValidationPipe {
  private hasMinimumAccessLevel(current: AccessLevel, required: AccessLevel): boolean {
    const levelHierarchy = {
      [AccessLevel.STANDARD]: 1,
      [AccessLevel.PREMIUM]: 2, 
      [AccessLevel.ADMIN]: 3,
    };
    
    return levelHierarchy[current] >= levelHierarchy[required];
  }
}
```

## Best Practices

### 1. Pipe Selection Guidelines

**Use ValidationPipe when**:
- Validating request bodies (DTOs)
- Complex nested object validation
- Need detailed field-level errors

**Use Transform Pipes when**:
- Converting query/path parameters
- Simple type validation
- Need optional parameter handling

**Use Business Pipes when**:
- Domain-specific validation rules
- Security-sensitive operations
- Cross-cutting concerns (pagination, search)

### 2. Error Message Consistency

```typescript
// Good: Descriptive, actionable error messages
throw new BadRequestException(
  `Page must be between 1 and ${maxPages} for parameter "page"`
);

// Bad: Generic, unhelpful error messages  
throw new BadRequestException('Invalid input');
```

### 3. Configuration Patterns

```typescript
// Good: Centralized pipe configuration
const PAGINATION_CONFIG = {
  defaultPage: 1,
  defaultLimit: 10,
  maxLimit: 100,
  minLimit: 1
};

@Query('page', new ParseIntPipe(PAGINATION_CONFIG))
```

### 4. Reusability

```typescript
// Create reusable pipe instances
export const StandardUUIDPipe = new ParseUUIDPipe({ version: '4' });
export const OptionalIntPipe = new ParseIntPipe({ optional: true, min: 1 });
export const SafeStringPipe = new SecuritySanitizationPipe({ 
  preventXss: true, 
  maxLength: 500 
});

// Use across controllers
@Param('id', StandardUUIDPipe) id: string
@Query('page', OptionalIntPipe) page?: number  
@Query('search', SafeStringPipe) search?: string
```

### 5. Performance Considerations

```typescript
// Good: Validate early, fail fast
@Query('ids', new ParseArrayPipe({ maxItems: 10 }))

// Good: Use appropriate limits
@Query('search', new TrimPipe({ maxLength: 100 }))

// Avoid: Unlimited input sizes that could cause DoS
```

### 6. Testing Patterns

```typescript
describe('ParseIntPipe', () => {
  let pipe: ParseIntPipe;

  beforeEach(() => {
    pipe = new ParseIntPipe({ min: 1, max: 100 });
  });

  it('should transform valid integer string', () => {
    expect(pipe.transform('42', mockMetadata)).toBe(42);
  });

  it('should throw BadRequestException for invalid input', () => {
    expect(() => pipe.transform('abc', mockMetadata))
      .toThrow(BadRequestException);
  });
});
```

## Advanced Usage Patterns

### Custom Pipe Creation

```typescript
@Injectable()
export class CustomBusinessPipe implements PipeTransform {
  constructor(
    private readonly userService: UserService,
    private readonly logger: Logger
  ) {}

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    // Access services for complex validation
    // Log validation attempts
    // Transform based on business rules
  }
}
```

### Conditional Validation

```typescript
@Injectable()
export class ConditionalValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    // Apply different validation based on user role
    const request = getCurrentRequest();
    const userRole = request.user?.role;
    
    if (userRole === 'admin') {
      // Less restrictive validation for admins
    } else {
      // Strict validation for regular users  
    }
  }
}
```

### Async Validation

```typescript
@Injectable()
export class AsyncValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    // Validate against database
    // Check external services
    // Perform async business rule validation
  }
}
```

## Conclusion

Pipes provide a robust foundation for input validation and transformation in NestJS applications. They enable:

- **Early Validation**: Catch errors before they reach business logic
- **Type Safety**: Ensure runtime type correctness
- **Security**: Protect against common attacks and malicious input
- **Consistency**: Standardized validation across your API
- **Maintainability**: Centralized validation logic that's easy to test and update

The layered approach with validation, transformation, and business logic pipes ensures that each type of data processing is handled appropriately while maintaining clean separation of concerns.

By integrating pipes with your existing middleware, guards, and exception filters, you create a comprehensive request processing pipeline that is secure, reliable, and maintainable.