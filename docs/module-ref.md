# ModuleRef with Dynamic Modules - Complete Guide

This document demonstrates how to use `ModuleRef` to dynamically access providers from dynamic modules in NestJS.

## Overview

`ModuleRef` is a powerful utility class in NestJS that provides access to the dependency injection container at runtime. When combined with dynamic modules, it enables sophisticated patterns for:

- Dynamic provider resolution
- Runtime service discovery
- Conditional provider access
- Module introspection
- Testing and debugging

## What is ModuleRef?

`ModuleRef` acts as a registry for all providers within a module's dependency injection container. It allows you to:

1. **Get instances** of providers by class or token
2. **Check existence** of providers
3. **Create new instances** (though not recommended for singletons)
4. **Access configuration** and options

## Basic Usage Patterns

### 1. Injecting ModuleRef

```typescript
import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class MyService {
  constructor(private readonly moduleRef: ModuleRef) {}
}
```

### 2. Getting Provider Instances

```typescript
// Get by class
const catsService = this.moduleRef.get(CatsService);

// Get by token
const options = this.moduleRef.get(CATS_MODULE_OPTIONS);

// Get with options
const service = this.moduleRef.get(CatsService, { strict: false });
```

### 3. Safe Provider Access

```typescript
safeGet<T>(token: any, defaultValue?: T): T | null {
  try {
    return this.moduleRef.get<T>(token, { strict: false });
  } catch (error) {
    return defaultValue || null;
  }
}
```

## Dynamic Module Integration

### Configuration Access

```typescript
// Access dynamic module configuration
getCatsModuleOptions(): CatsModuleOptions {
  return this.moduleRef.get<CatsModuleOptions>(CATS_MODULE_OPTIONS);
}
```

### Service Discovery

```typescript
// Check if providers exist
hasProvider(token: any): boolean {
  try {
    this.moduleRef.get(token, { strict: false });
    return true;
  } catch {
    return false;
  }
}
```

## API Endpoints for ModuleRef Testing

Our implementation provides several endpoints to test ModuleRef functionality:

### 1. Get Cats via ModuleRef
```
GET /cats/module-ref/cats
```
Retrieves cats using ModuleRef instead of direct injection.

### 2. Module Information
```
GET /cats/module-ref/module-info
```
Returns comprehensive module configuration and provider information.

### 3. Services Discovery
```
GET /cats/module-ref/services-info
```
Discovers all available services and their methods.

### 4. Conditional Access
```
GET /cats/module-ref/conditional-access?provider=CatsService
```
Demonstrates conditional provider access by token name.

### 5. Provider Existence Check
```
GET /cats/module-ref/has-provider?provider=CatsService
```
Checks if specific providers exist in the container.

### 6. Create New Instance
```
POST /cats/module-ref/create-instance
```
Creates a new service instance (demonstrates but not recommended for singletons).

### 7. Async Service Access
```
GET /cats/module-ref/async-service
```
Retrieves services asynchronously.

## Advanced Use Cases

### 1. Runtime Service Resolution

```typescript
@Injectable()
export class DynamicServiceResolver {
  constructor(private moduleRef: ModuleRef) {}

  resolveService(serviceName: string) {
    const serviceMap = {
      'cats': CatsService,
      'tasks': TasksService,
      // Add more services as needed
    };

    const serviceClass = serviceMap[serviceName];
    if (!serviceClass) {
      throw new Error(`Service ${serviceName} not found`);
    }

    return this.moduleRef.get(serviceClass, { strict: false });
  }
}
```

### 2. Feature Toggle Implementation

```typescript
@Injectable()
export class FeatureService {
  constructor(private moduleRef: ModuleRef) {}

  isFeatureEnabled(feature: string): boolean {
    try {
      const config = this.moduleRef.get(FEATURE_CONFIG_TOKEN);
      return config.features[feature] === true;
    } catch {
      return false; // Feature disabled if config not found
    }
  }

  getFeatureService<T>(token: any): T | null {
    if (!this.isFeatureEnabled('advanced-cats')) {
      return null;
    }
    
    return this.moduleRef.get<T>(token, { strict: false });
  }
}
```

### 3. Plugin System

```typescript
@Injectable()
export class PluginManager {
  constructor(private moduleRef: ModuleRef) {}

  loadPlugin(pluginToken: string) {
    try {
      const plugin = this.moduleRef.get(pluginToken, { strict: false });
      return {
        loaded: true,
        plugin,
        methods: this.getPluginMethods(plugin),
      };
    } catch (error) {
      return {
        loaded: false,
        error: error.message,
      };
    }
  }

  private getPluginMethods(plugin: any): string[] {
    return Object.getOwnPropertyNames(Object.getPrototypeOf(plugin))
      .filter(name => name !== 'constructor' && typeof plugin[name] === 'function');
  }
}
```

### 4. Testing Helper

```typescript
@Injectable()
export class TestHelper {
  constructor(private moduleRef: ModuleRef) {}

  getAllProviders(): Array<{ token: any; instance: any }> {
    const knownTokens = [
      CatsService,
      CATS_MODULE_OPTIONS,
      TasksService,
      // Add other known tokens
    ];

    return knownTokens
      .map(token => ({
        token: token.name || token.toString(),
        instance: this.moduleRef.get(token, { strict: false }),
      }))
      .filter(item => item.instance !== null);
  }

  getProviderInfo(token: any) {
    try {
      const instance = this.moduleRef.get(token, { strict: false });
      return {
        exists: true,
        type: typeof instance,
        constructor: instance.constructor.name,
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(instance))
          .filter(name => name !== 'constructor'),
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message,
      };
    }
  }
}
```

## Best Practices

### 1. Error Handling
Always wrap `moduleRef.get()` calls in try-catch blocks or use the `{ strict: false }` option.

### 2. Type Safety
Use TypeScript generics for better type safety:
```typescript
const service = this.moduleRef.get<CatsService>(CatsService);
```

### 3. Caching
For frequently accessed providers, consider caching the reference:
```typescript
private _catsService: CatsService;

get catsService(): CatsService {
  if (!this._catsService) {
    this._catsService = this.moduleRef.get(CatsService);
  }
  return this._catsService;
}
```

### 4. Avoid Creating New Instances
Don't use `new ServiceClass()` unless you specifically need a new instance. Use the DI container instead.

### 5. Documentation
Document which providers your service depends on via ModuleRef for better maintainability.

## Common Pitfalls

### 1. Circular Dependencies
Be careful not to create circular dependencies when using ModuleRef.

### 2. Provider Not Found
Always handle cases where providers might not exist, especially in optional features.

### 3. Scope Issues
Remember that ModuleRef respects provider scopes (singleton, transient, request-scoped).

### 4. Testing
Mock ModuleRef properly in unit tests:

```typescript
const mockModuleRef = {
  get: jest.fn().mockImplementation((token) => {
    if (token === CatsService) return mockCatsService;
    if (token === CATS_MODULE_OPTIONS) return mockConfig;
    throw new Error('Provider not found');
  }),
};
```

## Real-World Examples

### 1. Multi-Tenant Application
```typescript
@Injectable()
export class TenantService {
  constructor(private moduleRef: ModuleRef) {}

  getTenantSpecificService(tenantId: string, serviceType: string) {
    const token = `${serviceType}_${tenantId}`;
    return this.moduleRef.get(token, { strict: false });
  }
}
```

### 2. Configuration-Based Services
```typescript
@Injectable()
export class ConfigurableService {
  constructor(private moduleRef: ModuleRef) {}

  getStorageService() {
    const config = this.moduleRef.get(APP_CONFIG);
    const storageType = config.storage.type;
    
    const storageServices = {
      'file': FILE_STORAGE_SERVICE,
      'database': DATABASE_STORAGE_SERVICE,
      'memory': MEMORY_STORAGE_SERVICE,
    };

    return this.moduleRef.get(storageServices[storageType]);
  }
}
```

### 3. Microservices Communication
```typescript
@Injectable()
export class ServiceRegistry {
  constructor(private moduleRef: ModuleRef) {}

  discoverServices(): string[] {
    const serviceTokens = ['USER_SERVICE', 'ORDER_SERVICE', 'PAYMENT_SERVICE'];
    
    return serviceTokens.filter(token => {
      try {
        this.moduleRef.get(token, { strict: false });
        return true;
      } catch {
        return false;
      }
    });
  }
}
```

## Conclusion

ModuleRef is a powerful tool for dynamic provider access in NestJS applications. When combined with dynamic modules, it enables sophisticated architectural patterns while maintaining type safety and testability. Use it judiciously for cases where compile-time dependency injection isn't sufficient for your application's needs.