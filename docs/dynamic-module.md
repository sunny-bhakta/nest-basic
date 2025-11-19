# Dynamic CatsModule Examples

This document demonstrates how to use the dynamic CatsModule with various configuration options.

## Overview

The CatsModule has been converted to a dynamic module that supports:
- **forRoot()**: Synchronous configuration
- **forRootAsync()**: Asynchronous configuration  
- **forFeature()**: Simple module without configuration

## Configuration Options

```typescript
interface CatsModuleOptions {
  defaultCats?: Array<{ name: string; age: number }>;  // Initial cats data
  storageType?: 'memory' | 'file' | 'database';       // Storage backend
  maxCats?: number;                                    // Maximum cats limit
  enableLogging?: boolean;                             // Enable service logging
}
```

## Usage Examples

### 1. Basic Dynamic Module (forRoot)

```typescript
import { Module } from '@nestjs/common';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [
    CatsModule.forRoot({
      defaultCats: [
        { name: 'Whiskers', age: 2 },
        { name: 'Mittens', age: 4 },
      ],
      storageType: 'memory',
      maxCats: 50,
      enableLogging: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Async Configuration with useFactory

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CatsModule } from './cats/cats.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CatsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        defaultCats: [
          { name: configService.get('DEFAULT_CAT_NAME'), age: 1 },
        ],
        storageType: configService.get('STORAGE_TYPE', 'memory'),
        maxCats: configService.get('MAX_CATS', 100),
        enableLogging: configService.get('ENABLE_LOGGING', true),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 3. Async Configuration with useClass

```typescript
import { Injectable } from '@nestjs/common';
import { CatsOptionsFactory, CatsModuleOptions } from './cats/interfaces/cats-module-options.interface';

@Injectable()
export class CatsConfigService implements CatsOptionsFactory {
  createCatsOptions(): CatsModuleOptions {
    return {
      defaultCats: [
        { name: 'ConfigCat', age: 5 },
      ],
      storageType: 'database',
      maxCats: 200,
      enableLogging: process.env.NODE_ENV !== 'production',
    };
  }
}

@Module({
  imports: [
    CatsModule.forRootAsync({
      useClass: CatsConfigService,
    }),
  ],
  providers: [CatsConfigService],
})
export class AppModule {}
```

### 4. Async Configuration with useExisting

```typescript
@Module({
  imports: [
    CatsModule.forRootAsync({
      useExisting: CatsConfigService,
    }),
  ],
  providers: [CatsConfigService],
})
export class AppModule {}
```

### 5. Feature Module (Backward Compatibility)

```typescript
@Module({
  imports: [
    CatsModule.forFeature(), // Uses default configuration
  ],
})
export class FeatureModule {}
```

## Multiple Module Instances

You can create multiple instances with different configurations:

```typescript
@Module({
  imports: [
    // Development cats
    CatsModule.forRoot({
      defaultCats: [{ name: 'DevCat', age: 1 }],
      storageType: 'memory',
      maxCats: 10,
      enableLogging: true,
    }),
    
    // Production cats (would need different providers/tokens)
    // This is just an example - you'd typically use different modules
  ],
})
export class AppModule {}
```

## Environment-Based Configuration

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot(),
    CatsModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('NODE_ENV') === 'production';
        
        return {
          defaultCats: isProduction 
            ? [] // No default cats in production
            : [{ name: 'TestCat', age: 1 }],
          storageType: isProduction ? 'database' : 'memory',
          maxCats: isProduction ? 1000 : 50,
          enableLogging: !isProduction,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Testing with Dynamic Modules

```typescript
// cats.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CatsService } from './cats.service';
import { CatsModule } from './cats.module';

describe('CatsService', () => {
  let service: CatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        CatsModule.forRoot({
          defaultCats: [{ name: 'TestCat', age: 1 }],
          storageType: 'memory',
          maxCats: 5,
          enableLogging: false, // Disable logging in tests
        }),
      ],
    }).compile();

    service = module.get<CatsService>(CatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have test cat', () => {
    const cats = service.getCats();
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe('TestCat');
  });
});
```

## Advanced Usage: Multiple Storage Types

```typescript
// Different storage implementations
const memoryConfig = {
  storageType: 'memory' as const,
  maxCats: 50,
  enableLogging: true,
};

const databaseConfig = {
  storageType: 'database' as const,
  maxCats: 1000,
  enableLogging: false,
};

const fileConfig = {
  storageType: 'file' as const,
  maxCats: 200,
  enableLogging: true,
};

@Module({
  imports: [
    CatsModule.forRoot(
      process.env.STORAGE_TYPE === 'db' ? databaseConfig :
      process.env.STORAGE_TYPE === 'file' ? fileConfig :
      memoryConfig
    ),
  ],
})
export class AppModule {}
```

## Key Benefits of Dynamic Modules

1. **Runtime Configuration**: Configure modules based on environment variables or other runtime conditions
2. **Reusability**: Same module can be used with different configurations across applications
3. **Testing**: Easy to configure modules for different testing scenarios
4. **Feature Flags**: Enable/disable features based on configuration
5. **Multiple Instances**: Create multiple instances of the same module with different configurations

## Best Practices

1. Always provide sensible defaults in your configuration
2. Use TypeScript interfaces for type safety
3. Document all configuration options
4. Consider backwards compatibility when converting existing modules
5. Use environment variables for production configurations
6. Disable logging in production for performance
7. Validate configuration options at startup