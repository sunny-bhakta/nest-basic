# Dynamic Modules Example - NestJS

This project demonstrates the implementation and usage of **Dynamic Modules** in NestJS, showcasing various patterns and best practices for creating configurable, reusable modules.

## 🚀 Quick Start

### Installation & Running
```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Start production server
npm run start:prod

# Build the application
npm run build
```

### Testing & Coverage
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# Run specific test file
npm test -- users.service.spec.ts

# Generate detailed coverage report
npm run test:cov -- --coverage --coverageDirectory=coverage

```







## 📋 Supported API Endpoints

Explore the available endpoints demonstrating each dynamic module pattern and provider technique:

| Endpoint | Description |
|----------|-------------|
| [`/for-root`](http://localhost:3000/for-root) | Demonstrates the **forRoot()** global synchronous configuration pattern |
| [`/for-root-async`](http://localhost:3000/for-root-async) | Demonstrates the **forRootAsync()** global asynchronous configuration pattern |
| [`/check-provider-export-in-dynamic-module`](http://localhost:3000/check-provider-export-in-dynamic-module) | Shows service injection and provider export from a dynamic module |
| [`/users/for-feature`](http://localhost:3000/users/for-feature) | Demonstrates the **forFeature()** feature/module-scoped synchronous configuration pattern |
| [`/users/for-feature-async`](http://localhost:3000/users/for-feature-async) | Demonstrates the **forFeatureAsync()** feature/module-scoped asynchronous configuration pattern |
| [`/users/use-class`](http://localhost:3000/users/use-class) | Demonstrates the **register()** pattern for dynamic implementation selection via `useClass` |
| [`/users/use-existing`](http://localhost:3000/users/use-existing) | Demonstrates the **useExisting** provider pattern for reusing existing providers |

> ℹ️ All endpoints are available by default at `http://localhost:3000/` after starting the application.

---

## 🎯 Custom Dynamic Module Concepts Explained

### 1. **`forRoot()` Pattern - Global Synchronous Configuration**

**Purpose**: Registers a global, synchronously-configured provider for application-wide configuration.

```typescript
static forRoot(option: any): DynamicModule {
    return {
        module: CustomDynamicModule,
        providers: [
            CustomDynamicModuleService,
            {
                provide: "FOR_ROOT_PROVIDER",
                useValue: option,
            },
        ],
        exports: [CustomDynamicModuleService, "FOR_ROOT_PROVIDER"],
    };
}
```

**Key Characteristics**:
- 🌐 **Global Scope**: Available throughout the entire application
- 🔄 **Single Use**: Should only be used once in the root module (AppModule)
- ⚡ **Synchronous**: No async operations, immediate configuration
- 🏗️ **Foundation Setup**: Used for database connections, API keys, global settings


**Example Usage**:
```typescript
// In AppModule
imports: [
  CustomDynamicModule.forRoot({ "forRootProvider": 'Global API Key' })
]
```

---

### 2. **`forFeature()` Pattern - Feature-Specific Synchronous Configuration**

**Purpose**: Registers a feature-scoped, synchronously-configured provider for contextual or module-level configuration.

```typescript
static forFeature(option: any): DynamicModule {
    return {
        module: CustomDynamicModule,
        providers: [
            {
                provide: "FOR_FEATURE_PROVIDER",
                useValue: option,
            },
        ],
        exports: ["FOR_FEATURE_PROVIDER"],
    };
}
```

**Key Characteristics**:
- 📦 **Module Scope**: Scoped to the importing module only
- 🎯 **Feature-Specific**: Each module can have its own distinct configuration
- 🔄 **Reusable**: Can be used multiple times with different configurations
- ⚡ **Synchronous**: Immediate configuration without async operations

**Real-World Use Cases**:
- Feature-specific table names (e.g., `users_table`, `orders_table`)
- Module-specific API endpoints
- Feature toggles and configurations
- Context-aware settings

**Example Usage**:
```typescript
// In UsersModule
imports: [
  CustomDynamicModule.forFeature('users_table_config')
]
```

---

### 3. **`forRootAsync()` Pattern - Global Asynchronous Configuration**

**Purpose**: Registers a global, asynchronously-configured provider for application-wide configuration with dependency injection support.

```typescript
static forRootAsync(options: IAsyncFactoryOptions<IForRootAsyncResult>): DynamicModule {
    return {
        module: CustomDynamicModule,
        imports: options.imports || [],
        providers: [
            {
                provide: "FOR_ROOT_ASYNC_PROVIDER",
                useFactory: options.useFactory,
                inject: options.inject || [],
            },
        ],
        exports: ["FOR_ROOT_ASYNC_PROVIDER"],
    };
}
```

**Key Characteristics**:
- 🌐 **Global Scope**: Available throughout the entire application
- 🔄 **Async Operations**: Supports fetching configuration from remote sources
- 💉 **Dependency Injection**: Can inject other services (ConfigService, HttpService, etc.)
- 🏗️ **Advanced Setup**: Complex initialization logic with external dependencies

**Real-World Use Cases**:
- Fetching secrets from remote services (AWS Secrets Manager, Azure Key Vault)
- Database connection validation
- Loading configuration from external APIs
- Environment-specific async setup

**Example Usage**:
```typescript
// In AppModule
imports: [
  CustomDynamicModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const dbConnectionString = await configService.getDatabaseConnectionString();
      return { forRootAsyncProvider: dbConnectionString };
    },
  })
]
```

---

### 4. **`forFeatureAsync()` Pattern - Feature-Specific Asynchronous Configuration**

**Purpose**: Registers a dynamic, asynchronously-configured provider for feature or module-level configuration.

```typescript
static forFeatureAsync(options: IAsyncFactoryOptions<IForFeatureAsync>): DynamicModule {
    return {
        module: CustomDynamicModule,
        imports: options.imports || [],
        providers: [
            {
                provide: "FOR_FEATURE_ASYNC_PROVIDER",
                useFactory: options.useFactory,
                inject: options.inject || [],
            },
        ],
        exports: ["FOR_FEATURE_ASYNC_PROVIDER"],
    };
}
```

**Key Characteristics**:
- 📦 **Module Scope**: Scoped to the importing module
- 🔄 **Async Operations**: Supports asynchronous configuration loading
- 💉 **Dependency Injection**: Can inject services for complex setup
- 🎯 **Feature-Specific**: Each feature can have unique async configuration

**Real-World Use Cases**:
- Fetching feature-specific configuration from APIs
- Loading module-specific data from external sources
- Runtime feature flag evaluation
- Dynamic API endpoint discovery

**Example Usage**:
```typescript
// In UsersModule
imports: [
  CustomDynamicModule.forFeatureAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      const endpoint = await configService.getFeatureEndpoint('users');
      return { forFeatureAsyncProvider: endpoint };
    },
  })
]
```

---

### 5. **`register()` Pattern - Implementation Selection**

**Purpose**: Registers a language-specific greeting provider demonstrating the `useClass` provider pattern for contextual dependency injection.

```typescript
static register(language: "en" | "de"): DynamicModule {
    const useClass = language === "en" ? GreetEnglish : GreetGerman;
    return {
        module: CustomDynamicModule,
        providers: [
            {
                provide: "USE_CLASS_PROVIDER",
                useClass,
            },
        ],
        exports: ["USE_CLASS_PROVIDER"],
    };
}
```

**Key Characteristics**:
- 🎭 **Implementation Selection**: Choose different class implementations
- 🌍 **Context-Aware**: Behavior changes based on input parameters
- 🔄 **Simple Registration**: Straightforward pattern for switching implementations
- 🏗️ **UseClass Pattern**: Demonstrates dynamic class provider selection

**Real-World Use Cases**:
- Language/locale selection (`GreetEnglish`, `GreetGerman`)
- Algorithm implementation choice (`FastSorter`, `StableSorter`)
- Environment-specific implementations (`DevLogger`, `ProdLogger`)
- Platform-specific services (`WindowsFileService`, `LinuxFileService`)

**Example Usage**:
```typescript
// For English
imports: [
  CustomDynamicModule.register("en")
]

// For German  
imports: [
  CustomDynamicModule.register("de")
]
```

---






    