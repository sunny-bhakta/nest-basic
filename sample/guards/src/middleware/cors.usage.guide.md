# CORS Configuration Usage Guide

## 📁 File Structure
```
src/
├── config/
│   ├── cors.config.ts          # Main CORS configuration
│   └── cors.manager.ts         # Dynamic CORS management
├── middleware/
│   ├── security-headers.middleware.ts          # Updated middleware
│   └── enhanced-security-headers.middleware.ts # Alternative with CorsManager
└── .env.example                # Environment variables template
```

## 🎯 How to Use cors.config.ts

### 1. **Basic Usage (Current Implementation)**
Your middleware now uses the configuration from `cors.config.ts`:

```typescript
// Automatically gets configuration based on NODE_ENV
const config = getCurrentConfig();

// Apply CORS headers from config
res.header('Access-Control-Allow-Origin', getAllowedOrigin(requestOrigin));
res.header('Access-Control-Allow-Methods', config.cors.methods.join(','));
```

### 2. **Environment-Based Configuration**
The system automatically selects configuration based on `NODE_ENV`:

```bash
# Development
NODE_ENV=development  # Uses corsConfigs.development

# Staging  
NODE_ENV=staging      # Uses corsConfigs.staging

# Production
NODE_ENV=production   # Uses corsConfigs.production

# Test
NODE_ENV=test         # Uses corsConfigs.test
```

### 3. **Customizing Origins per Environment**

**Edit `cors.config.ts`:**
```typescript
export const corsConfigs = {
  development: {
    origins: [
      'http://localhost:3000',    // Your NestJS app
      'http://localhost:4200',    # Your Angular app
      'http://localhost:8080',    # Your Vue/React app
      // Add more development URLs
    ],
    // ... other config
  },
  
  production: {
    origins: [
      'https://myapp.com',
      'https://app.myapp.com',
      'https://admin.myapp.com',
    ],
    // ... other config
  }
};
```

## 🔧 Advanced Usage with Environment Variables

### 1. **Override with Environment Variables**
Use the `CorsManager` for dynamic configuration:

```typescript
// In app.module.ts
import { EnhancedSecurityHeadersMiddleware } from './middleware/enhanced-security-headers.middleware';

// Replace SecurityHeadersMiddleware with EnhancedSecurityHeadersMiddleware
consumer.apply(EnhancedSecurityHeadersMiddleware)
```

### 2. **Environment Variables Override**
Create `.env` file:
```bash
# Override origins dynamically
ALLOWED_ORIGINS=https://myapp.com,https://app.myapp.com,https://admin.myapp.com

# Override credentials setting
ENABLE_CORS_CREDENTIALS=true

# Override max age
CORS_MAX_AGE=7200
```

## 🎨 Configuration Examples

### 1. **Frontend on Different Domains**
```typescript
// cors.config.ts
production: {
  origins: [
    'https://myapp.com',           // Main website
    'https://app.myapp.com',       // Web application
    'https://admin.myapp.com',     // Admin panel
    'https://mobile.myapp.com',    // Mobile web app
  ],
  credentials: true,               // Allow cookies/auth
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}
```

### 2. **API Gateway Setup**
```typescript
// For microservices behind API gateway
production: {
  origins: [
    'https://api-gateway.myapp.com',
  ],
  credentials: false,              // Gateway handles auth
  methods: ['GET', 'POST'],
}
```

### 3. **Mobile App + Web App**
```typescript
development: {
  origins: [
    'http://localhost:3000',       // Web development
    'http://localhost:4200',       
    'capacitor://localhost',       // Ionic Capacitor
    'http://localhost:8100',       // Ionic serve
  ],
}
```

## 🚀 Switching Between Middlewares

### Current Middleware (Basic)
```typescript
// app.module.ts
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';

consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
```

### Enhanced Middleware (With Environment Variables)
```typescript
// app.module.ts  
import { EnhancedSecurityHeadersMiddleware } from './middleware/enhanced-security-headers.middleware';

consumer.apply(EnhancedSecurityHeadersMiddleware).forRoutes('*');
```

## 🛠️ Using with NestJS Built-in CORS

### Alternative: Configure CORS in main.ts
Instead of middleware, you can use NestJS built-in CORS:

```typescript
// main.ts
import { corsManager } from './config/cors.manager';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Use configuration from cors.config.ts
  app.enableCors(corsManager.getCorsOptions());
  
  await app.listen(3000);
}
```

## 🔍 Testing CORS Configuration

### 1. **Test Different Origins**
```bash
# Test allowed origin
curl -H "Origin: https://myapp.com" http://localhost:3000/api

# Test disallowed origin  
curl -H "Origin: https://malicious.com" http://localhost:3000/api

# Test preflight request
curl -X OPTIONS -H "Origin: https://myapp.com" \
     -H "Access-Control-Request-Method: POST" \
     http://localhost:3000/api
```

### 2. **Debug CORS Issues**
The `CorsManager` logs configuration on startup:
```
🔒 CORS Configuration:
   Environment: development
   Allowed Origins: http://localhost:3000, http://localhost:4200
   Credentials: true
   Max Age: 86400s
⚠️  Development mode: Additional localhost origins may be allowed
```

## 📊 Best Practices

### 1. **Environment-Specific Security**
```typescript
// Strict production settings
production: {
  origins: ['https://myapp.com'],           # Specific domains only
  credentials: true,                        # Enable for auth
  methods: ['GET', 'POST', 'PUT', 'DELETE'], # Only needed methods
}

// Permissive development settings  
development: {
  origins: true,                            # Allow all for development
  credentials: true,
  methods: ['*'],                           # All methods
}
```

### 2. **Security Headers by Environment**
```typescript
// Production CSP - strict
production: {
  csp: {
    directives: "default-src 'self'; script-src 'self';"  # No unsafe-inline
  }
}

// Development CSP - permissive
development: {
  csp: {
    directives: "default-src 'self'; script-src 'self' 'unsafe-inline';"
  }
}
```

### 3. **Monitoring and Logging**
```typescript
// Log CORS rejections for monitoring
if (!allowedOrigin && requestOrigin) {
  console.warn(`🚫 CORS: Rejected origin: ${requestOrigin}`);
}
```

## 🎯 Common Use Cases

### 1. **Single Page Application**
```typescript
origins: ['https://myapp.com'],
credentials: true,  # For authentication cookies
```

### 2. **Multiple Subdomains**
```typescript
origins: [
  'https://app.mycompany.com',
  'https://admin.mycompany.com', 
  'https://api.mycompany.com'
],
```

### 3. **CDN and Assets**
```typescript
// Allow CDN origins for assets
origins: [
  'https://myapp.com',
  'https://cdn.myapp.com',
  'https://assets.myapp.com'
],
```

This configuration system gives you complete control over CORS while maintaining security best practices! 🛡️