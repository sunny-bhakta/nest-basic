# 🛡️ NestJS Security System Documentation

## 📋 Table of Contents

- [Overview](#-overview)
- [Security Components](#-security-components)
- [Decorators](#-decorators)
- [Guards](#-guards)
- [Access Levels](#-access-levels)
- [Architecture](#-architecture)
- [Installation & Setup](#-installation--setup)
- [Usage Examples](#-usage-examples)
- [Authentication Flow](#-authentication-flow)
- [Authorization Flow](#-authorization-flow)
- [Security Best Practices](#-security-best-practices)
- [Testing](#-testing)
- [Troubleshooting](#-troubleshooting)
- [Advanced Scenarios](#-advanced-scenarios)

## 🌟 Overview

This NestJS application implements a comprehensive security system with role-based access control (RBAC), token-based authentication, and flexible authorization decorators. The security system provides a multi-layered approach to protect endpoints with customizable access levels and authentication requirements.

### Key Features
- **🔐 Token-Based Authentication**: Bearer token validation with expiration handling
- **👥 Role-Based Access Control**: Hierarchical access levels (Guest → Super Admin)
- **🎯 Flexible Decorators**: Easy-to-use decorators for endpoint protection
- **🚪 Guard Composition**: Composable guards for authentication and authorization
- **⚡ Skip Authentication**: Selective bypass for public endpoints
- **🔍 Request Context Integration**: Seamless integration with request tracking
- **🛡️ Security Service**: Centralized token and credential management

## 🧩 Security Components

### Architecture Overview
```
┌─────────────────────┐
│    Decorators       │
│  @SecureEndpoint    │ ← High-level endpoint protection
│  @RequireAccessLevel│ ← Access level requirements
│  @SkipAuth          │ ← Authentication bypass
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│      Guards         │
│  BearerTokenGuard   │ ← Token validation
│  UserAccessGuard    │ ← Authorization checks
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│   Security Service  │ ← Token management & validation
└─────────────────────┘
```

## 🎨 Decorators

### 1. 🔒 @SecureEndpoint Decorator
**File**: `src/security/decorators/secure.decorator.ts`

**Purpose**: Comprehensive endpoint protection with optional access level specification

```typescript
import { applyDecorators, UseGuards } from "@nestjs/common";
import { BearerTokenGuard } from "../guards/bearer-token.guard";
import { UserAccessGuard } from "../guards/user-access.guard";
import { AccessLevel } from "../../enums/access-level.enum";
import { RequireAccessLevel } from "./access-level.decorator";

export function SecureEndpoint(accessLevel?: AccessLevel) {
    const decorators = [
        UseGuards(BearerTokenGuard, UserAccessGuard),
    ]

    if (accessLevel) {
        decorators.push(RequireAccessLevel(accessLevel));
    }

    return applyDecorators(...decorators);
}
```

**Features**:
- Applies both authentication and authorization guards
- Optional access level specification
- Combines multiple decorators into one
- Ensures proper guard execution order

**Usage Examples**:
```typescript
// Basic authentication required
@SecureEndpoint()
@Get('profile')
getProfile() {
    return { message: 'User profile data' };
}

// Admin access required
@SecureEndpoint(AccessLevel.ADMIN)
@Post('users')
createUser(@Body() userData: any) {
    return this.userService.create(userData);
}

// Premium access required
@SecureEndpoint(AccessLevel.PREMIUM)
@Get('premium-content')
getPremiumContent() {
    return { content: 'Premium exclusive data' };
}
```

### 2. 🎯 @RequireAccessLevel Decorator
**File**: `src/security/decorators/access-level.decorator.ts`

**Purpose**: Specifies minimum access level required for endpoint access

```typescript
import { SetMetadata } from "@nestjs/common";
import { AccessLevel } from "../../enums/access-level.enum";

export const ACCESS_LEVEL_KEY = 'accessLevel';
export const RequireAccessLevel = (level: AccessLevel) => {
    return SetMetadata(ACCESS_LEVEL_KEY, level);
}
```

**Features**:
- Sets metadata for access level requirements
- Used by UserAccessGuard for authorization
- Hierarchical access control
- Composable with other decorators

**Usage Examples**:
```typescript
// Individual decorator usage
@RequireAccessLevel(AccessLevel.PREMIUM)
@UseGuards(BearerTokenGuard, UserAccessGuard)
@Get('premium-data')
getPremiumData() {
    return { data: 'Premium content' };
}

// Class-level access control
@Controller('admin')
@RequireAccessLevel(AccessLevel.ADMIN)
export class AdminController {
    
    @Get('dashboard')
    getDashboard() {
        // Inherits ADMIN access requirement
        return { dashboard: 'Admin dashboard data' };
    }
    
    @Get('users')
    @RequireAccessLevel(AccessLevel.SUPER_ADMIN) // Override: requires SUPER_ADMIN
    getUsers() {
        return { users: [] };
    }
}
```

### 3. 🚪 @SkipAuth Decorator
**File**: `src/security/decorators/skip-auth.decorator.ts`

**Purpose**: Bypasses authentication for public endpoints

```typescript
import { SetMetadata } from "@nestjs/common";

export const SKIP_AUTH_KEY = 'skipAuth';

export const SkipAuth = () => {
    return SetMetadata(SKIP_AUTH_KEY, true);
}
```

**Features**:
- Marks endpoints as public
- Recognized by BearerTokenGuard
- Useful for login, registration, health checks
- Can be applied to methods or classes

**Usage Examples**:
```typescript
// Public login endpoint
@SkipAuth()
@Post('login')
login(@Body() credentials: LoginDto) {
    return this.authService.login(credentials);
}

// Public registration
@SkipAuth()
@Post('register')
register(@Body() userData: RegisterDto) {
    return this.authService.register(userData);
}

// Public health check
@SkipAuth()
@Get('health')
healthCheck() {
    return { status: 'ok', timestamp: new Date() };
}

// Class-level public access
@Controller('public')
@SkipAuth()
export class PublicController {
    
    @Get('info')
    getInfo() {
        // No authentication required
        return { info: 'Public information' };
    }
    
    @Get('docs')
    getDocs() {
        // No authentication required
        return { docs: 'API documentation' };
    }
}
```

## 🛡️ Guards

### 1. 🔐 BearerTokenGuard
**File**: `src/security/guards/bearer-token.guard.ts`

**Purpose**: Validates Bearer tokens and populates user context

```typescript
@Injectable()
export class BearerTokenGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly securityService: SecurityService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if authentication should be skipped
        const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (skipAuth) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException("Invalid or expired token");
        }

        try {
            const user = await this.securityService.validateToken(token);
            request.user = user;
            
            // Update request context with user info if available
            if (request.context) {
                request.context.user = {
                    id: user.id,
                    username: user.username,
                    accessLevel: user.accessLevel,
                };
            }
            
            return true;
        } catch (error) {
            throw new UnauthorizedException("Invalid or expired token");
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
```

**Features**:
- Bearer token extraction from Authorization header
- Token validation through SecurityService
- User context population in request object
- Integration with request context middleware
- Skip authentication support via @SkipAuth decorator
- Comprehensive error handling

**Token Format**:
```http
Authorization: Bearer <token>
```

**Request Enhancement**:
```typescript
// After BearerTokenGuard execution:
request.user = {
    id: 1,
    username: 'john.doe',
    accessLevel: 'admin',
    tokenIssuedAt: Date
};

request.context.user = {
    id: 1,
    username: 'john.doe',
    accessLevel: 'admin'
};
```

### 2. 👥 UserAccessGuard  
**File**: `src/security/guards/user-access.guard.ts`

**Purpose**: Enforces role-based access control based on access levels

```typescript
@Injectable()
export class UserAccessGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredAccessLevel = this.reflector.getAllAndOverride<AccessLevel>(ACCESS_LEVEL_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredAccessLevel) {
            return true; // No access level requirement
        }

        const user = await context.switchToHttp().getRequest().user;
        if (!user) {
            throw new ForbiddenException("User authentication required");
        }

        if (!this.hasRequiredAccess(user.accessLevel, requiredAccessLevel)) {
            throw new ForbiddenException(`Access level '${requiredAccessLevel}' required`);
        }

        return true;
    }

    private hasRequiredAccess(userLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
        const levels = Object.values(AccessLevel);
        const userLevelIndex = levels.indexOf(userLevel);
        const requiredLevelIndex = levels.indexOf(requiredLevel);

        return userLevelIndex >= requiredLevelIndex;
    }
}
```

**Features**:
- Hierarchical access level checking
- Metadata-driven requirements via @RequireAccessLevel
- User authentication validation
- Detailed error messages
- Flexible access level comparison

## 🏆 Access Levels

### AccessLevel Enum
**File**: `src/enums/access-level.enum.ts`

```typescript
export enum AccessLevel {
  GUEST = 'guest',
  STANDARD = 'standard', 
  PREMIUM = 'premium',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}
```

### Hierarchy & Permissions

```
┌──────────────┐
│  SUPER_ADMIN │ ← Full system access
└──────┬───────┘
       │ Inherits ↓
┌──────▼───────┐
│    ADMIN     │ ← Administrative functions
└──────┬───────┘
       │ Inherits ↓
┌──────▼───────┐
│   PREMIUM    │ ← Premium features + Standard
└──────┬───────┘
       │ Inherits ↓
┌──────▼───────┐
│   STANDARD   │ ← Basic authenticated features
└──────┬───────┘
       │ Inherits ↓
┌──────▼───────┐
│    GUEST     │ ← Limited access
└──────────────┘
```

### Access Level Matrix

| Feature | Guest | Standard | Premium | Admin | Super Admin |
|---------|-------|----------|---------|--------|-------------|
| Public Endpoints | ✅ | ✅ | ✅ | ✅ | ✅ |
| User Profile | ❌ | ✅ | ✅ | ✅ | ✅ |
| Premium Content | ❌ | ❌ | ✅ | ✅ | ✅ |
| User Management | ❌ | ❌ | ❌ | ✅ | ✅ |
| System Configuration | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🏗️ Architecture

### Guard Execution Order
```
1. BearerTokenGuard
   ├─ Extract Bearer token
   ├─ Validate token via SecurityService
   ├─ Populate request.user
   └─ Update request.context.user

2. UserAccessGuard
   ├─ Check required access level metadata
   ├─ Validate user authentication
   ├─ Compare user vs required access level
   └─ Allow/Deny access
```

### Integration Flow
```
┌─────────────────┐
│   HTTP Request  │
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Middleware    │ ← Request Context, Logging, etc.
└─────────┬───────┘
          │
┌─────────▼───────┐
│ BearerTokenGuard│ ← Authentication
└─────────┬───────┘
          │
┌─────────▼───────┐
│ UserAccessGuard │ ← Authorization
└─────────┬───────┘
          │
┌─────────▼───────┐
│   Controller    │ ← Business Logic
└─────────────────┘
```

## 📦 Installation & Setup

### 1. Basic Module Setup

```typescript
// security.module.ts
import { Module } from '@nestjs/common';
import { SecurityService } from './security.service';
import { SecurityController } from './security.controller';
import { BearerTokenGuard } from './guards/bearer-token.guard';
import { UserAccessGuard } from './guards/user-access.guard';

@Module({
  providers: [
    SecurityService,
    BearerTokenGuard,
    UserAccessGuard,
  ],
  controllers: [SecurityController],
  exports: [
    SecurityService,
    BearerTokenGuard,
    UserAccessGuard,
  ],
})
export class SecurityModule {}
```

### 2. Application Module Integration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { SecurityModule } from './security/security.module';
import { BearerTokenGuard } from './security/guards/bearer-token.guard';

@Module({
  imports: [
    SecurityModule,
    // ... other modules
  ],
  providers: [
    // Global authentication guard (optional)
    {
      provide: APP_GUARD,
      useClass: BearerTokenGuard,
    },
  ],
})
export class AppModule {}
```

### 3. Global vs Local Guard Usage

#### Global Guards (Recommended)
```typescript
// Apply to all routes by default
{
  provide: APP_GUARD,
  useClass: BearerTokenGuard,
}

// Use @SkipAuth() to exclude specific routes
@SkipAuth()
@Get('public-data')
getPublicData() {
  return { data: 'Public information' };
}
```

#### Local Guards (Manual Control)
```typescript
// Apply guards manually to specific routes
@UseGuards(BearerTokenGuard, UserAccessGuard)
@RequireAccessLevel(AccessLevel.ADMIN)
@Get('admin-data')
getAdminData() {
  return { data: 'Admin information' };
}
```

## 📖 Usage Examples

### 1. Basic Authentication

```typescript
@Controller('api')
export class ApiController {
  
  // Public endpoint - no authentication required
  @SkipAuth()
  @Get('info')
  getApiInfo() {
    return { 
      version: '1.0.0', 
      status: 'active',
      timestamp: new Date()
    };
  }
  
  // Authenticated endpoint - any valid user
  @SecureEndpoint()
  @Get('profile')
  getProfile(@Req() request: any) {
    const user = request.user;
    return {
      id: user.id,
      username: user.username,
      accessLevel: user.accessLevel,
      lastLogin: user.tokenIssuedAt
    };
  }
}
```

### 2. Role-Based Access Control

```typescript
@Controller('users')
export class UsersController {
  
  // Standard users can view their own profile
  @SecureEndpoint(AccessLevel.STANDARD)
  @Get('me')
  getMyProfile(@Req() request: any) {
    return this.userService.findById(request.user.id);
  }
  
  // Premium users can access premium features
  @SecureEndpoint(AccessLevel.PREMIUM)
  @Get('premium-stats')
  getPremiumStats() {
    return this.analyticsService.getPremiumStats();
  }
  
  // Admin users can manage all users
  @SecureEndpoint(AccessLevel.ADMIN)
  @Get()
  getAllUsers(@Query() filters: any) {
    return this.userService.findAll(filters);
  }
  
  @SecureEndpoint(AccessLevel.ADMIN)
  @Post()
  createUser(@Body() userData: CreateUserDto) {
    return this.userService.create(userData);
  }
  
  // Super admin can access system functions
  @SecureEndpoint(AccessLevel.SUPER_ADMIN)
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.delete(id);
  }
}
```

### 3. Mixed Security Requirements

```typescript
@Controller('content')
export class ContentController {
  
  // Public content
  @SkipAuth()
  @Get('public')
  getPublicContent() {
    return this.contentService.getPublic();
  }
  
  // User-specific content (any authenticated user)
  @SecureEndpoint()
  @Get('personal')
  getPersonalContent(@Req() request: any) {
    return this.contentService.getPersonal(request.user.id);
  }
  
  // Premium content
  @SecureEndpoint(AccessLevel.PREMIUM)
  @Get('premium')
  getPremiumContent() {
    return this.contentService.getPremium();
  }
  
  // Admin content management
  @SecureEndpoint(AccessLevel.ADMIN)
  @Post()
  createContent(@Body() content: CreateContentDto) {
    return this.contentService.create(content);
  }
  
  @SecureEndpoint(AccessLevel.ADMIN)
  @Put(':id')
  updateContent(@Param('id') id: string, @Body() content: UpdateContentDto) {
    return this.contentService.update(id, content);
  }
}
```

### 4. Class-Level vs Method-Level Security

```typescript
// Class-level security with method overrides
@Controller('admin')
@SecureEndpoint(AccessLevel.ADMIN) // Default admin access for all methods
export class AdminController {
  
  @Get('dashboard')
  getDashboard() {
    // Inherits ADMIN access level
    return this.adminService.getDashboard();
  }
  
  @SecureEndpoint(AccessLevel.SUPER_ADMIN) // Override to require super admin
  @Delete('system/reset')
  resetSystem() {
    return this.adminService.resetSystem();
  }
  
  @SkipAuth() // Override to make public
  @Get('health')
  getHealthStatus() {
    return { status: 'healthy' };
  }
}
```

## 🔐 Authentication Flow

### 1. Login Process

```typescript
// Login controller
@Controller('auth')
export class AuthController {
  constructor(private securityService: SecurityService) {}
  
  @SkipAuth()
  @Post('login')
  async login(@Body() credentials: LoginDto) {
    try {
      // Validate credentials
      const user = await this.securityService.validateCredentials(
        credentials.username, 
        credentials.password
      );
      
      // Generate token
      const token = await this.securityService.generateToken(user);
      
      return {
        success: true,
        token: token,
        user: {
          id: user.userId,
          username: user.username,
          accessLevel: user.accessLevel
        },
        expiresIn: 3600 // 1 hour
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
}
```

### 2. Token Validation Process

```
┌─────────────────┐
│ Client Request  │
│ Authorization:  │
│ Bearer <token>  │
└─────────┬───────┘
          │
┌─────────▼───────┐
│BearerTokenGuard │
│ 1. Extract token│
│ 2. Validate     │
│ 3. Get user     │
│ 4. Set context  │
└─────────┬───────┘
          │
┌─────────▼───────┐
│ Request Object  │
│ request.user =  │
│ { id, username, │
│   accessLevel } │
└─────────────────┘
```

### 3. Client-Side Integration

```typescript
// Frontend authentication service example
class AuthService {
  private token: string | null = null;
  
  async login(username: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const result = await response.json();
    
    if (result.success) {
      this.token = result.token;
      localStorage.setItem('token', result.token);
      return result.user;
    } else {
      throw new Error(result.message);
    }
  }
  
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const token = this.token || localStorage.getItem('token');
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }
  
  logout() {
    this.token = null;
    localStorage.removeItem('token');
  }
}
```

## 🎯 Authorization Flow

### 1. Access Level Checking

```typescript
// UserAccessGuard authorization logic
private hasRequiredAccess(userLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
  const levels = Object.values(AccessLevel);
  const userLevelIndex = levels.indexOf(userLevel);
  const requiredLevelIndex = levels.indexOf(requiredLevel);
  
  return userLevelIndex >= requiredLevelIndex;
}

// Example checks:
// User: ADMIN, Required: STANDARD → true (4 >= 1)
// User: STANDARD, Required: PREMIUM → false (1 < 2)
// User: SUPER_ADMIN, Required: ADMIN → true (4 >= 3)
```

### 2. Dynamic Authorization

```typescript
// Custom authorization logic
@Controller('resources')
export class ResourceController {
  
  @SecureEndpoint()
  @Get(':id')
  async getResource(
    @Param('id') id: string, 
    @Req() request: any
  ) {
    const resource = await this.resourceService.findById(id);
    const user = request.user;
    
    // Owner can always access
    if (resource.ownerId === user.id) {
      return resource;
    }
    
    // Admin can access all resources
    if (user.accessLevel === AccessLevel.ADMIN || 
        user.accessLevel === AccessLevel.SUPER_ADMIN) {
      return resource;
    }
    
    // Premium users can access premium resources
    if (resource.type === 'premium' && 
        [AccessLevel.PREMIUM, AccessLevel.ADMIN, AccessLevel.SUPER_ADMIN]
        .includes(user.accessLevel)) {
      return resource;
    }
    
    throw new ForbiddenException('Access denied to this resource');
  }
}
```

## 🔒 Security Best Practices

### 1. Token Management

```typescript
// Security service with enhanced token management
@Injectable()
export class EnhancedSecurityService {
  private readonly validTokens = new Map<string, TokenData>();
  private readonly revokedTokens = new Set<string>();
  
  async generateToken(credentials: any): Promise<TokenResponse> {
    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    const tokenData: TokenData = {
      id: credentials.userId,
      username: credentials.username,
      accessLevel: credentials.accessLevel,
      tokenIssuedAt: new Date(),
      expiresAt: new Date(Date.now() + (1000 * 60 * 60)), // 1 hour
      lastActivity: new Date(),
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent,
    };
    
    this.validTokens.set(token, tokenData);
    
    // Schedule token cleanup
    setTimeout(() => {
      this.validTokens.delete(token);
    }, 1000 * 60 * 60); // 1 hour
    
    return {
      token,
      expiresIn: 3600,
      tokenType: 'Bearer'
    };
  }
  
  async validateToken(token: string): Promise<any> {
    // Check if token is revoked
    if (this.revokedTokens.has(token)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    
    const tokenData = this.validTokens.get(token);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid token');
    }
    
    // Check expiration
    if (new Date() > tokenData.expiresAt) {
      this.validTokens.delete(token);
      throw new UnauthorizedException('Token has expired');
    }
    
    // Update last activity
    tokenData.lastActivity = new Date();
    
    return {
      id: tokenData.id,
      username: tokenData.username,
      accessLevel: tokenData.accessLevel,
      tokenIssuedAt: tokenData.tokenIssuedAt
    };
  }
  
  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.add(token);
    this.validTokens.delete(token);
  }
  
  async revokeAllUserTokens(userId: number): Promise<void> {
    for (const [token, data] of this.validTokens.entries()) {
      if (data.id === userId) {
        this.revokedTokens.add(token);
        this.validTokens.delete(token);
      }
    }
  }
}
```

### 2. Rate Limiting Integration

```typescript
// Enhanced Bearer Token Guard with rate limiting
@Injectable()
export class EnhancedBearerTokenGuard implements CanActivate {
  private readonly loginAttempts = new Map<string, number>();
  
  constructor(
    private readonly reflector: Reflector,
    private readonly securityService: SecurityService,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const clientIp = request.ip;
    
    // Check rate limiting for failed attempts
    const failedAttempts = this.loginAttempts.get(clientIp) || 0;
    if (failedAttempts >= 5) {
      throw new TooManyRequestsException('Too many failed authentication attempts');
    }
    
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      this.incrementFailedAttempts(clientIp);
      throw new UnauthorizedException("No token provided");
    }
    
    try {
      const user = await this.securityService.validateToken(token);
      
      // Reset failed attempts on successful authentication
      this.loginAttempts.delete(clientIp);
      
      request.user = user;
      
      if (request.context) {
        request.context.user = {
          id: user.id,
          username: user.username,
          accessLevel: user.accessLevel,
        };
      }
      
      return true;
    } catch (error) {
      this.incrementFailedAttempts(clientIp);
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
  
  private incrementFailedAttempts(clientIp: string): void {
    const current = this.loginAttempts.get(clientIp) || 0;
    this.loginAttempts.set(clientIp, current + 1);
    
    // Clean up after 15 minutes
    setTimeout(() => {
      this.loginAttempts.delete(clientIp);
    }, 15 * 60 * 1000);
  }
}
```

### 3. Security Headers Integration

```typescript
// Custom decorator combining security headers and authentication
export function SecureEndpointWithHeaders(accessLevel?: AccessLevel) {
  return applyDecorators(
    // Security headers
    Header('X-Content-Type-Options', 'nosniff'),
    Header('X-Frame-Options', 'DENY'),
    Header('X-XSS-Protection', '1; mode=block'),
    
    // Authentication and authorization
    SecureEndpoint(accessLevel),
    
    // Request/response transformation
    UseInterceptors(SecurityInterceptor)
  );
}
```

## 🧪 Testing

### 1. Unit Testing Guards

```typescript
// BearerTokenGuard unit tests
describe('BearerTokenGuard', () => {
  let guard: BearerTokenGuard;
  let securityService: SecurityService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BearerTokenGuard,
        {
          provide: SecurityService,
          useValue: {
            validateToken: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<BearerTokenGuard>(BearerTokenGuard);
    securityService = module.get<SecurityService>(SecurityService);
    reflector = module.get<Reflector>(Reflector);
  });

  describe('canActivate', () => {
    it('should allow access when @SkipAuth is present', async () => {
      const context = createMockExecutionContext({
        headers: {},
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = await guard.canActivate(context);
      
      expect(result).toBe(true);
      expect(securityService.validateToken).not.toHaveBeenCalled();
    });

    it('should validate token when present', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        accessLevel: AccessLevel.STANDARD,
      };
      
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid-token-123',
        },
        context: {},
      };
      
      const context = createMockExecutionContext(mockRequest);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(securityService, 'validateToken').mockResolvedValue(mockUser);

      const result = await guard.canActivate(context);
      
      expect(result).toBe(true);
      expect(securityService.validateToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockRequest.user).toEqual(mockUser);
      expect(mockRequest.context.user).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        accessLevel: mockUser.accessLevel,
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid-token',
        },
      };
      
      const context = createMockExecutionContext(mockRequest);

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      jest.spyOn(securityService, 'validateToken')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const context = createMockExecutionContext({
        headers: {},
      });

      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

### 2. Integration Testing

```typescript
// Integration tests for secured endpoints
describe('Secured Endpoints Integration', () => {
  let app: INestApplication;
  let securityService: SecurityService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    securityService = moduleFixture.get<SecurityService>(SecurityService);
    
    await app.init();
  });

  describe('GET /api/profile', () => {
    it('should require authentication', async () => {
      return request(app.getHttpServer())
        .get('/api/profile')
        .expect(401)
        .expect(res => {
          expect(res.body.message).toContain('token');
        });
    });

    it('should return user profile with valid token', async () => {
      // Create user and token
      const token = await securityService.generateToken({
        userId: 1,
        username: 'testuser',
        accessLevel: AccessLevel.STANDARD,
      });

      return request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect(res => {
          expect(res.body.username).toBe('testuser');
          expect(res.body.accessLevel).toBe(AccessLevel.STANDARD);
        });
    });
  });

  describe('Access Level Restrictions', () => {
    it('should deny access to admin endpoint for standard user', async () => {
      const token = await securityService.generateToken({
        userId: 1,
        username: 'standarduser',
        accessLevel: AccessLevel.STANDARD,
      });

      return request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
        .expect(res => {
          expect(res.body.message).toContain('admin');
        });
    });

    it('should allow access to admin endpoint for admin user', async () => {
      const token = await securityService.generateToken({
        userId: 2,
        username: 'adminuser',
        accessLevel: AccessLevel.ADMIN,
      });

      return request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
```

### 3. E2E Authentication Flow Testing

```typescript
// End-to-end authentication flow tests
describe('Authentication Flow (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should complete full authentication flow', async () => {
    // 1. Login with valid credentials
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin',
      })
      .expect(200);

    expect(loginResponse.body.success).toBe(true);
    expect(loginResponse.body.token).toBeDefined();
    
    const token = loginResponse.body.token;

    // 2. Access protected endpoint with token
    const profileResponse = await request(app.getHttpServer())
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(profileResponse.body.username).toBe('admin');
    expect(profileResponse.body.accessLevel).toBe(AccessLevel.ADMIN);

    // 3. Access admin endpoint (should succeed)
    await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // 4. Access super admin endpoint (should fail)
    await request(app.getHttpServer())
      .delete('/admin/system/reset')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. **"Invalid or expired token" Error**

**Problem**: Users getting authentication errors with valid tokens

**Diagnosis**:
```typescript
// Add debug logging to BearerTokenGuard
console.log('Received token:', token);
console.log('Token validation result:', await this.securityService.validateToken(token));
```

**Solutions**:
```typescript
// Check token format
private extractTokenFromHeader(request: any): string | undefined {
  const authHeader = request.headers.authorization;
  console.log('Authorization header:', authHeader);
  
  if (!authHeader) {
    console.log('No authorization header found');
    return undefined;
  }
  
  const [type, token] = authHeader.split(' ');
  
  if (type !== 'Bearer') {
    console.log('Invalid token type:', type);
    return undefined;
  }
  
  return token;
}

// Check token expiration
async validateToken(token: string): Promise<any> {
  const user = this.validTokens.get(token);
  
  if (!user) {
    console.log('Token not found in store:', token);
    throw new UnauthorizedException('Token not found');
  }
  
  const tokenAge = Date.now() - user.tokenIssuedAt.getTime();
  const maxAge = 1000 * 60 * 60; // 1 hour
  
  console.log('Token age:', tokenAge, 'Max age:', maxAge);
  
  if (tokenAge > maxAge) {
    console.log('Token expired');
    this.validTokens.delete(token);
    throw new UnauthorizedException('Token expired');
  }
  
  return user;
}
```

#### 2. **Access Denied for Valid Users**

**Problem**: Users with sufficient access level getting 403 errors

**Diagnosis**:
```typescript
// Add debug logging to UserAccessGuard
async canActivate(context: ExecutionContext): Promise<boolean> {
  const requiredAccessLevel = this.reflector.getAllAndOverride<AccessLevel>(ACCESS_LEVEL_KEY, [
    context.getHandler(),
    context.getClass(),
  ]);
  
  console.log('Required access level:', requiredAccessLevel);
  
  const user = context.switchToHttp().getRequest().user;
  console.log('User access level:', user?.accessLevel);
  
  if (!requiredAccessLevel) {
    console.log('No access level requirement - allowing access');
    return true;
  }
  
  if (!user) {
    console.log('No user found in request');
    throw new ForbiddenException("User authentication required");
  }
  
  const hasAccess = this.hasRequiredAccess(user.accessLevel, requiredAccessLevel);
  console.log('Access check result:', hasAccess);
  
  return hasAccess;
}
```

**Solutions**:
```typescript
// Verify access level enum values
private hasRequiredAccess(userLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
  const levels = Object.values(AccessLevel);
  console.log('Available levels:', levels);
  
  const userLevelIndex = levels.indexOf(userLevel);
  const requiredLevelIndex = levels.indexOf(requiredLevel);
  
  console.log('User level index:', userLevelIndex, 'Required level index:', requiredLevelIndex);
  
  if (userLevelIndex === -1) {
    console.error('Invalid user access level:', userLevel);
    return false;
  }
  
  if (requiredLevelIndex === -1) {
    console.error('Invalid required access level:', requiredLevel);
    return false;
  }
  
  return userLevelIndex >= requiredLevelIndex;
}
```

#### 3. **@SkipAuth Not Working**

**Problem**: Public endpoints still requiring authentication

**Solutions**:
```typescript
// Verify decorator metadata key consistency
// In skip-auth.decorator.ts
export const SKIP_AUTH_KEY = 'skipAuth';

// In bearer-token.guard.ts  
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';

// Check metadata retrieval
const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
  context.getHandler(), // Method level
  context.getClass(),   // Class level
]);

console.log('Skip auth metadata:', skipAuth);

// Ensure proper decorator application
@SkipAuth() // Correct
@Get('public')
getPublic() {
  return { data: 'public' };
}

// Not this:
@Get('public')
@SkipAuth() // Order might matter in some cases
getPublic() {
  return { data: 'public' };
}
```

#### 4. **Guard Order Issues**

**Problem**: Guards executing in wrong order or conflicting

**Solutions**:
```typescript
// Correct guard order in @SecureEndpoint
export function SecureEndpoint(accessLevel?: AccessLevel) {
  const decorators = [
    UseGuards(BearerTokenGuard), // Authentication first
    UseGuards(UserAccessGuard),  // Authorization second
  ];

  if (accessLevel) {
    decorators.push(RequireAccessLevel(accessLevel));
  }

  return applyDecorators(...decorators);
}

// Or combined in single UseGuards call
export function SecureEndpoint(accessLevel?: AccessLevel) {
  const decorators = [
    UseGuards(BearerTokenGuard, UserAccessGuard), // Proper execution order
  ];

  if (accessLevel) {
    decorators.push(RequireAccessLevel(accessLevel));
  }

  return applyDecorators(...decorators);
}
```

### Performance Troubleshooting

#### Memory Leaks in Token Storage

```typescript
// Problem: Token map growing indefinitely
private readonly validTokens = new Map<string, any>();

// Solution: Implement cleanup
@Injectable()
export class SecurityService implements OnModuleDestroy {
  private readonly validTokens = new Map<string, TokenData>();
  private cleanupInterval: NodeJS.Timer;
  
  constructor() {
    // Cleanup expired tokens every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 10 * 60 * 1000);
  }
  
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
  
  private cleanupExpiredTokens() {
    const now = Date.now();
    const maxAge = 1000 * 60 * 60; // 1 hour
    
    for (const [token, data] of this.validTokens.entries()) {
      const age = now - data.tokenIssuedAt.getTime();
      if (age > maxAge) {
        this.validTokens.delete(token);
      }
    }
    
    console.log(`Token cleanup: ${this.validTokens.size} active tokens`);
  }
}
```

### Security Audit Checklist

```typescript
// Security audit implementation
@Injectable()
export class SecurityAuditService {
  private readonly auditLog: AuditEvent[] = [];
  
  logAuthenticationAttempt(success: boolean, username?: string, ip?: string) {
    this.auditLog.push({
      timestamp: new Date(),
      event: 'authentication_attempt',
      success,
      username,
      ip,
      details: success ? 'Login successful' : 'Login failed'
    });
  }
  
  logAccessDenied(username: string, resource: string, reason: string) {
    this.auditLog.push({
      timestamp: new Date(),
      event: 'access_denied',
      success: false,
      username,
      resource,
      details: reason
    });
  }
  
  logPrivilegedAction(username: string, action: string, resource: string) {
    this.auditLog.push({
      timestamp: new Date(),
      event: 'privileged_action',
      success: true,
      username,
      action,
      resource
    });
  }
  
  getAuditTrail(filters?: AuditFilter): AuditEvent[] {
    return this.auditLog.filter(event => {
      if (filters?.startDate && event.timestamp < filters.startDate) return false;
      if (filters?.endDate && event.timestamp > filters.endDate) return false;
      if (filters?.username && event.username !== filters.username) return false;
      if (filters?.eventType && event.event !== filters.eventType) return false;
      return true;
    });
  }
}
```

## 🚀 Advanced Scenarios

### 1. Multi-Tenant Security

```typescript
// Tenant-aware security
@Injectable()
export class TenantAwareSecurityGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.headers['x-tenant-id'];
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID required');
    }
    
    // Verify user belongs to tenant
    if (user.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied for this tenant');
    }
    
    // Add tenant context
    request.tenant = {
      id: tenantId,
      name: await this.getTenantName(tenantId)
    };
    
    return true;
  }
}

// Usage
@Controller('tenant-data')
@UseGuards(BearerTokenGuard, TenantAwareSecurityGuard)
export class TenantDataController {
  @Get()
  getTenantData(@Req() request: any) {
    const user = request.user;
    const tenant = request.tenant;
    
    return this.dataService.findByTenant(tenant.id);
  }
}
```

### 2. Dynamic Role Permissions

```typescript
// Permission-based access control
export interface Permission {
  resource: string;
  action: string; // 'create', 'read', 'update', 'delete'
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<Permission[]>(
      'permissions', 
      context.getHandler()
    );
    
    if (!requiredPermissions) {
      return true;
    }
    
    const user = context.switchToHttp().getRequest().user;
    
    // Get user permissions from database/cache
    const userPermissions = await this.getUserPermissions(user.id);
    
    // Check if user has all required permissions
    return requiredPermissions.every(required => 
      userPermissions.some(userPerm => 
        userPerm.resource === required.resource &&
        userPerm.action === required.action
      )
    );
  }
  
  private async getUserPermissions(userId: number): Promise<Permission[]> {
    // Implement permission lookup logic
    return [];
  }
}

// Permission decorator
export const RequirePermissions = (...permissions: Permission[]) => 
  SetMetadata('permissions', permissions);

// Usage
@Controller('documents')
export class DocumentController {
  
  @RequirePermissions(
    { resource: 'documents', action: 'read' }
  )
  @Get()
  findAll() {
    return this.documentService.findAll();
  }
  
  @RequirePermissions(
    { resource: 'documents', action: 'create' }
  )
  @Post()
  create(@Body() doc: CreateDocumentDto) {
    return this.documentService.create(doc);
  }
}
```

### 3. API Key Authentication

```typescript
// API Key guard for service-to-service communication
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeyService: ApiKeyService
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }
    
    try {
      const keyData = await this.apiKeyService.validateApiKey(apiKey);
      
      // Add API client context
      request.apiClient = {
        id: keyData.clientId,
        name: keyData.clientName,
        permissions: keyData.permissions,
        rateLimit: keyData.rateLimit
      };
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}

// Combined authentication: Bearer token OR API key
@Injectable()
export class FlexibleAuthGuard implements CanActivate {
  constructor(
    private bearerGuard: BearerTokenGuard,
    private apiKeyGuard: ApiKeyGuard
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Try Bearer token first
    if (request.headers.authorization?.startsWith('Bearer ')) {
      return this.bearerGuard.canActivate(context);
    }
    
    // Try API key if no Bearer token
    if (request.headers['x-api-key']) {
      return this.apiKeyGuard.canActivate(context);
    }
    
    throw new UnauthorizedException('Authentication required (Bearer token or API key)');
  }
}
```

---

## 📄 Related Documentation

- [Middleware Documentation](./MIDDLEWARE_DOCUMENTATION.md)
- [NestJS Guards Official Documentation](https://docs.nestjs.com/guards)
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

## 🤝 Contributing

When contributing to the security system:

1. **Follow security best practices**
2. **Add comprehensive tests**
3. **Update documentation**
4. **Consider backward compatibility**
5. **Audit for security vulnerabilities**

## 📝 License

This security system is part of the NestJS application and follows the same license terms as the main project.