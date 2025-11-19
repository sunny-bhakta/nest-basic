# Swagger API Documentation

## Overview

This NestJS application includes comprehensive Swagger API documentation that allows you to test all endpoints through an interactive UI.

## Accessing Swagger UI

Once the application is running:

1. **Start the application**:
   ```bash
   npm run start:dev
   ```

2. **Open Swagger UI**:
   - URL: http://localhost:3000/api
   - The interactive API documentation will be available

## API Endpoints Overview

### 🎪 Demo Endpoints (`/demo`)
Test endpoints to demonstrate the complete events system:

- **GET /demo/public** - Public endpoint (no auth required)
- **GET /demo/protected** - Protected endpoint (requires bearer token)  
- **GET /demo/admin** - Admin-only endpoint (requires admin token)
- **GET /demo/slow** - Slow endpoint (2s delay for performance events)
- **POST /demo/custom-event** - Emit custom processing events
- **POST /demo/batch/{count}** - Process batch items (generates multiple events)
- **GET /demo/error** - Trigger test error (for error event testing)
- **POST /demo/validate** - Validate user data (validation events)
- **GET /demo/health** - System health status

### 🛡️ Security Endpoints (`/auth`)
Authentication and authorization:

- **POST /auth/login** - Login to get bearer token

### 📚 Catalog Endpoints (`/catalog`)
Catalog management with various pipes and interceptors:

- **GET /catalog** - Get all catalog items (public)
- **GET /catalog/premium** - Get premium items (premium access required)
- **GET /catalog/search** - Advanced search with pagination
- **GET /catalog/{id}** - Get item by UUID
- **POST /catalog/users** - Create user (admin only)
- **POST /catalog/users/{id}** - Update user (premium access)
- **GET /catalog/admin/users** - Advanced user search (admin only)
- **DELETE /catalog/users/bulk** - Bulk delete users (admin only)

## Authentication

### Getting Bearer Tokens

1. **Login for Standard User**:
   ```json
   POST /auth/login
   {
     "username": "standard",
     "password": "standard123"
   }
   ```

2. **Login for Premium User**:
   ```json
   POST /auth/login
   {
     "username": "premium", 
     "password": "premium123"
   }
   ```

3. **Login for Admin User**:
   ```json
   POST /auth/login
   {
     "username": "admin",
     "password": "admin123"
   }
   ```

### Using Bearer Tokens

1. Copy the `access_token` from the login response
2. Click the "Authorize" button in Swagger UI
3. Enter: `Bearer YOUR_TOKEN_HERE`
4. Click "Authorize"

## Testing the Events System

### 1. **Basic Request Lifecycle Events**
```bash
GET /demo/public
```
- Generates: request.started, request.completed events
- No authentication required

### 2. **Authentication Events** 
```bash
GET /demo/protected
Authorization: Bearer YOUR_TOKEN
```
- Generates: authentication.success, authorization.success events
- Requires valid bearer token

### 3. **Performance Events**
```bash  
GET /demo/slow
```
- Generates: performance.slow, processing.complete events
- Simulates 2-second delay

### 4. **Validation Events**
```bash
POST /demo/validate
{
  "name": "John Doe",
  "email": "john@example.com", 
  "age": 25
}
```
- Success: Generates validation.success events
- Failure: Generates validation.failure events (try sending empty object)

### 5. **Processing Events**
```bash
POST /demo/batch/5
Authorization: Bearer YOUR_TOKEN
```
- Generates multiple processing.complete events
- Requires authentication

### 6. **Error Events**
```bash
GET /demo/error
```
- Generates: error.occurred, error.handled events
- Tests exception filter system

## Event Monitoring

All events are logged to the console with detailed information:

```
🎪 [EVENT] authentication.success - Duration: 15ms
🎯 [EVENT] authorization.success - Access Level: STANDARD
⚡ [EVENT] performance.slow - Duration: 2031ms (threshold: 1000ms)
✅ [EVENT] validation.success - Target: body
❌ [EVENT] validation.failure - Errors: ["Name is required"]
🔄 [EVENT] processing.complete - Handler: processBatch
💥 [EVENT] error.occurred - Message: Test error
```

## Swagger Features

### 1. **Interactive Testing**
- Try out all endpoints directly from the browser
- Automatic request/response examples
- Built-in authentication system

### 2. **Comprehensive Documentation**
- Detailed descriptions for each endpoint
- Request/response schemas with examples
- Parameter validation information

### 3. **DTO Validation**
- All request bodies use proper DTOs with validation
- @ApiProperty decorators provide schema information
- Examples for valid/invalid requests

## Example Usage Workflows

### Workflow 1: Test Events System
1. GET /demo/public (basic events)
2. POST /auth/login (get token) 
3. GET /demo/protected (auth events)
4. POST /demo/batch/3 (processing events)
5. GET /demo/slow (performance events)

### Workflow 2: Test Validation System  
1. POST /demo/validate with valid data
2. POST /demo/validate with invalid data
3. Check console for validation events

### Workflow 3: Test Error Handling
1. GET /demo/error
2. Check console for error events and exception filter logs

## Configuration

The Swagger configuration in `main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('NestJS Events & Guards Demo')
  .setDescription('Comprehensive demo of NestJS features...')
  .setVersion('2.0')
  .addTag('Demo', 'Test endpoints for events system')
  .addTag('Security', 'Authentication and authorization')
  .addTag('Catalog', 'Catalog management endpoints')
  .addBearerAuth()
  .build();
```

## Response Examples

### Successful Response
```json
{
  "message": "This is public data - check logs for events!",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Error Response  
```json
{
  "message": "Validation failed: Name is required, Email is required",
  "error": "Bad Request",
  "statusCode": 400
}
```

## Tips for Testing

1. **Open Browser Console**: Keep developer tools open to see event logs
2. **Test Different Access Levels**: Try protected endpoints with different user tokens
3. **Invalid Requests**: Test validation by sending incomplete data
4. **Performance Monitoring**: Use /demo/slow to see performance events
5. **Batch Processing**: Use /demo/batch/10 to generate multiple events

## Next Steps

1. Start the application: `npm run start:dev`
2. Open http://localhost:3000/api in your browser
3. Follow the example workflows above
4. Monitor console logs for comprehensive event information
5. Test all authentication levels and validation scenarios