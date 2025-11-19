# Complete API Endpoints Reference

This document lists ALL available endpoints in the NestJS application, including those that may not be currently active in the module configuration.

## 🎪 Demo Controller (`/demo`)
**Purpose**: Comprehensive events system testing and demonstration

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET    | `/demo/public` | ❌ No | Basic request lifecycle events |
| GET    | `/demo/protected` | ✅ Standard+ | Authentication and authorization events |
| GET    | `/demo/admin` | ✅ Admin | Admin-level access events |
| GET    | `/demo/slow` | ❌ No | Performance events (2s simulated delay) |
| POST   | `/demo/custom-event` | ❌ No | Manual event emission testing |
| POST   | `/demo/batch/{count}` | ✅ Standard+ | Batch processing with multiple events |
| GET    | `/demo/error` | ❌ No | Error handling and exception events |
| POST   | `/demo/validate` | ❌ No | Validation events (success/failure) |
| GET    | `/demo/health` | ❌ No | System health and uptime |

## 🛡️ Security Controller (`/auth`)
**Purpose**: Authentication and authorization management

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST   | `/auth/login` | ❌ No | User authentication and token generation |
| GET    | `/auth/profile` | ✅ Standard+ | Get current user profile |
| POST   | `/auth/refresh` | ✅ Standard+ | Refresh JWT token |

## 📚 Catalog Controller (`/catalog`)
**Purpose**: Advanced catalog management with comprehensive pipe/interceptor demonstrations

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET    | `/catalog` | ❌ No | Get all catalog items (public access) |
| GET    | `/catalog/premium` | ✅ Premium+ | Get premium catalog items |
| GET    | `/catalog/search` | ❌ No | Advanced search with pagination (cached) |
| GET    | `/catalog/{id}` | ❌ No | Get catalog item by UUID |
| POST   | `/catalog/users` | ✅ Admin | Create new user (validation demo) |
| POST   | `/catalog/users/{id}` | ✅ Premium+ | Update user information |
| GET    | `/catalog/admin/users` | ✅ Admin | Advanced user search with filtering |
| DELETE | `/catalog/users/bulk` | ✅ Admin | Bulk delete users by IDs |

## ⚙️ Admin - Interceptor Management (`/admin/interceptors`)
**Purpose**: System administration, cache management, and performance monitoring

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET    | `/admin/interceptors/health` | ✅ Admin | Comprehensive system health report |
| GET    | `/admin/interceptors/performance` | ✅ Admin | Detailed performance metrics |
| GET    | `/admin/interceptors/cache/stats` | ✅ Admin | Cache statistics and health |
| DELETE | `/admin/interceptors/cache` | ✅ Admin | Clear all cache entries |
| POST   | `/admin/interceptors/cache/invalidate` | ✅ Admin | Invalidate cache by pattern |
| POST   | `/admin/interceptors/cache/invalidate-routes` | ✅ Admin | Invalidate cache for specific routes |
| POST   | `/admin/interceptors/reset` | ✅ Admin | Reset all metrics and caches |
| POST   | `/admin/interceptors/configure` | ✅ Admin | Update interceptor configuration |
| GET    | `/admin/interceptors/cache/health` | ✅ Admin | Detailed cache health with recommendations |

## 🔐 Authentication Levels

| Level | Username | Password | Access |
|-------|----------|----------|---------|
| **Standard** | `standard` | `standard123` | Basic protected endpoints |
| **Premium** | `premium` | `premium123` | Premium features + Standard |
| **Admin** | `admin` | `admin123` | Full system access |

## 🎯 Testing Workflows

### 1. **Complete Events System Test**
```
1. GET /demo/public (basic events)
2. POST /auth/login (get token)
3. GET /demo/protected (auth events)
4. POST /demo/batch/5 (processing events)
5. GET /demo/slow (performance events)
6. GET /demo/error (error events)
```

### 2. **Admin System Management**
```
1. POST /auth/login (admin credentials)
2. GET /admin/interceptors/health (system status)
3. GET /admin/interceptors/performance (metrics)
4. POST /admin/interceptors/cache/invalidate (cache management)
5. GET /admin/interceptors/cache/stats (cache health)
```

### 3. **Catalog Advanced Features**
```
1. GET /catalog/search?q=laptop&page=1&limit=10 (cached search)
2. POST /auth/login (premium credentials)
3. GET /catalog/premium (premium content)
4. POST /catalog/users (create user - admin required)
```

### 4. **Validation and Error Testing**
```
1. POST /demo/validate (valid data)
2. POST /demo/validate (invalid data - triggers validation events)
3. GET /demo/error (exception handling)
4. GET /catalog/invalid-uuid (error handling demo)
```

## 📊 Event Types Generated

| Event Category | Endpoints | Events Generated |
|----------------|-----------|------------------|
| **Lifecycle** | All endpoints | `request.started`, `request.completed` |
| **Authentication** | Protected endpoints | `authentication.success/failure` |
| **Authorization** | Role-based endpoints | `authorization.success/denied` |
| **Performance** | `/demo/slow`, long-running | `performance.slow`, `performance.threshold` |
| **Validation** | `/demo/validate`, POST endpoints | `validation.success/failure` |
| **Processing** | `/demo/batch`, `/demo/custom-event` | `processing.start/complete` |
| **Cache** | Cached endpoints | `cache.hit/miss`, `cache.set` |
| **Error** | `/demo/error`, invalid requests | `error.occurred`, `error.handled` |
| **Rate Limit** | High-frequency requests | `ratelimit.exceeded`, `ratelimit.reset` |
| **Security** | All requests | `security.headers`, `security.validation` |

## 🏗️ Module Configuration Status

**Currently Active Modules** (in app.module.ts):
- ✅ SecurityModule
- ✅ EventsModule (with full configuration)

**Available but Commented Out**:
- 📦 ControllersModule (contains DemoController, InterceptorAdminController)
- 📦 CatalogModule (contains CatalogController)
- 📦 InterceptorsModule (for comprehensive request processing)

**To Enable All Features**:
Uncomment the modules in `app.module.ts`:
```typescript
imports: [
  SecurityModule,
  EventsModule.forRoot({...}),
  ControllersModule,        // ← Uncomment for Demo + Admin endpoints
  CatalogModule,           // ← Uncomment for Catalog endpoints  
  InterceptorsModule,      // ← Uncomment for full interceptor pipeline
],
```

## 🎨 Swagger UI Features

- **Interactive Testing**: Test all endpoints directly from browser
- **Authentication Integration**: Built-in "Authorize" button for JWT tokens
- **Request/Response Examples**: Comprehensive examples for all endpoints
- **DTO Validation**: Real-time validation with detailed error messages
- **Event Documentation**: Detailed descriptions of events generated
- **Performance Monitoring**: Admin endpoints for system health

## 📈 Monitoring and Observability

All endpoints generate detailed console logs:
- 🎪 **Event Logs**: Real-time lifecycle event information
- 📊 **Performance Metrics**: Response times, cache hit rates
- 🛡️ **Security Events**: Authentication, authorization results
- 🚨 **Error Tracking**: Comprehensive error information with IDs
- 📦 **Cache Analytics**: Hit/miss ratios, memory usage

Access the complete API documentation at: **http://localhost:3000/api**