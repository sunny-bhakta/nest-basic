import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppController } from './app.controller';
import { CustomDynamicModuleService } from './customdynamicmodule/customdynamicmodule.service';

describe('AppModule', () => {
  let module: TestingModule;
  let appController: AppController;
  let customDynamicModuleService: CustomDynamicModuleService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    appController = module.get<AppController>(AppController);
    customDynamicModuleService = module.get<CustomDynamicModuleService>(CustomDynamicModuleService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide AppController', () => {
    expect(appController).toBeDefined();
    expect(appController).toBeInstanceOf(AppController);
  });

  it('should provide CustomDynamicModuleService', () => {
    expect(customDynamicModuleService).toBeDefined();
    expect(customDynamicModuleService).toBeInstanceOf(CustomDynamicModuleService);
  });

  it('should import UsersModule and provide USE_EXISTING_PROVIDER', () => {
    // Test that UsersModule components are available and properly configured
    const useExistingProvider = module.get('USE_EXISTING_PROVIDER');
    expect(useExistingProvider).toBeDefined();
    expect(typeof useExistingProvider.sayHello).toBe('function');
    expect(useExistingProvider.sayHello()).toBe('Hello from UsersService!');
  });

  describe('CustomDynamicModule.forRoot integration', () => {
    it('should provide FOR_ROOT_PROVIDER', () => {
      const provider = module.get('FOR_ROOT_PROVIDER');
      expect(provider).toEqual({ forRootProvider: 'From Root Provider' });
    });

    it('should make CustomDynamicModuleService available globally', () => {
      const service = module.get<CustomDynamicModuleService>(CustomDynamicModuleService);
      expect(service.checkProviderExportInDynamicModule()).toBe('This is from CustomDynamicModuleService');
    });
  });

  describe('CustomDynamicModule.forRootAsync integration', () => {
    it('should provide FOR_ROOT_ASYNC_PROVIDER', () => {
      const provider = module.get('FOR_ROOT_ASYNC_PROVIDER');
      expect(provider).toBeDefined();
      expect(provider).toHaveProperty('forRootAsyncProvider');
    });

    it('should use ConfigService in factory', () => {
      const provider = module.get('FOR_ROOT_ASYNC_PROVIDER');
      // Since we don't set the env var, it should use the fallback value
      expect(provider.forRootAsyncProvider).toBe('From Root Async Provider');
    });
  });

  describe('Controller functionality', () => {
    it('should handle forRootMessage', () => {
      const result = appController.forRootMessage();
      expect(result).toEqual({ forRootProvider: 'From Root Provider' });
    });

    it('should handle forRootAsyncMessage', () => {
      const result = appController.forRootAsyncMessage();
      expect(result).toBeDefined();
      expect(result).toHaveProperty('forRootAsyncProvider');
    });

    it('should handle checkProviderExportInDynamicModule', () => {
      const result = appController.checkProviderExportInDynamicModule();
      expect(result).toEqual({
        checkProviderExportInDynamicModule: 'This is from CustomDynamicModuleService'
      });
    });
  });

  describe('Module integration', () => {
    it('should combine all CustomDynamicModule methods correctly', () => {
      // Test that all providers from different dynamic module methods are available
      expect(() => module.get('FOR_ROOT_PROVIDER')).not.toThrow();
      expect(() => module.get('FOR_ROOT_ASYNC_PROVIDER')).not.toThrow();
      expect(() => module.get<CustomDynamicModuleService>(CustomDynamicModuleService)).not.toThrow();
    });

    it('should handle providers from imported modules', () => {
      // Test that providers from AppModule work correctly
      const forRootProvider = module.get('FOR_ROOT_PROVIDER');
      expect(forRootProvider).toEqual({ forRootProvider: 'From Root Provider' });
    });
  });

  describe('Configuration integration', () => {
    it('should handle ConfigModule integration', () => {
      const configService = module.get<ConfigService>(ConfigService);
      expect(configService).toBeDefined();
    });

    it('should use environment fallback in forRootAsync', () => {
      const asyncProvider = module.get('FOR_ROOT_ASYNC_PROVIDER');
      expect(asyncProvider.forRootAsyncProvider).toBe('From Root Async Provider');
    });
  });
});