import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { CustomDynamicModule } from './customdynamicmodule.module';
import { CustomDynamicModuleService } from './customdynamicmodule.service';
import { GreetEnglish } from '../greet/greet.english';
import { GreetGerman } from '../greet/greet.german';

describe('CustomDynamicModule', () => {
  
  describe('forRoot', () => {
    let module: TestingModule;
    
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [CustomDynamicModule.forRoot({ forRootProvider: 'Test Root Provider' })],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide FOR_ROOT_PROVIDER', () => {
      const provider = module.get('FOR_ROOT_PROVIDER');
      expect(provider).toEqual({"forRootProvider": 'Test Root Provider'});
    });

    it('should provide CustomDynamicModuleService', () => {
      const service = module.get(CustomDynamicModuleService);
      expect(service).toBeDefined();
      expect(service.checkProviderExportInDynamicModule()).toBe('This is from CustomDynamicModuleService');
    });

    it('should export the service and provider', async () => {
      const exportedProvider = module.get('FOR_ROOT_PROVIDER');
      const exportedService = module.get(CustomDynamicModuleService);
      
      expect(exportedProvider).toBeDefined();
      expect(exportedService).toBeDefined();
    });
  });

  describe('forFeature', () => {
    let module: TestingModule;
    
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [CustomDynamicModule.forFeature({'forFeatureProvider': 'Test Feature Provider'})],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide FOR_FEATURE_PROVIDER', () => {
      const provider = module.get('FOR_FEATURE_PROVIDER');
      expect(provider).toEqual({'forFeatureProvider': 'Test Feature Provider'});
    });

    it('should export FOR_FEATURE_PROVIDER', () => {
      const exportedProvider = module.get('FOR_FEATURE_PROVIDER');
      expect(exportedProvider).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    let module: TestingModule;
    
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          CustomDynamicModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
              return { forRootAsyncProvider: 'Test Async Root Provider' };
            },
          }),
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide FOR_ROOT_ASYNC_PROVIDER', () => {
      const provider = module.get('FOR_ROOT_ASYNC_PROVIDER');
      expect(provider).toEqual({ forRootAsyncProvider: 'Test Async Root Provider' });
    });

    it('should inject ConfigService into factory', async () => {
      const provider = module.get('FOR_ROOT_ASYNC_PROVIDER');
      expect(provider).toBeDefined();
      expect(provider.forRootAsyncProvider).toBe('Test Async Root Provider');
    });
  });

  describe('forFeatureAsync', () => {
    let module: TestingModule;
    
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          CustomDynamicModule.forFeatureAsync({
            useFactory: async () => {
              return { forFeatureAsyncProvider: 'Test Async Feature Provider' };
            },
          }),
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide FOR_FEATURE_ASYNC_PROVIDER', () => {
      const provider = module.get('FOR_FEATURE_ASYNC_PROVIDER');
      expect(provider).toEqual({ forFeatureAsyncProvider: 'Test Async Feature Provider' });
    });
  });

  describe('register', () => {
    describe('with English language', () => {
      let module: TestingModule;
      
      beforeEach(async () => {
        module = await Test.createTestingModule({
          imports: [CustomDynamicModule.register('en')],
        }).compile();
      });

      afterEach(async () => {
        await module.close();
      });

      it('should provide GreetEnglish as USE_CLASS_PROVIDER', () => {
        const provider = module.get('USE_CLASS_PROVIDER');
        expect(provider).toBeInstanceOf(GreetEnglish);
      });

      it('should use English greeting', () => {
        const provider = module.get('USE_CLASS_PROVIDER');
        const result = provider.useClassGreetByLanguage('World');
        expect(result).toEqual({'useClass': 'Hello! World.'});
      });
    });

    describe('with German language', () => {
      let module: TestingModule;
      
      beforeEach(async () => {
        module = await Test.createTestingModule({
          imports: [CustomDynamicModule.register('de')],
        }).compile();
      });

      afterEach(async () => {
        await module.close();
      });

      it('should provide GreetGerman as USE_CLASS_PROVIDER', () => {
        const provider = module.get('USE_CLASS_PROVIDER');
        expect(provider).toBeInstanceOf(GreetGerman);
      });

      it('should use German greeting', () => {
        const provider = module.get('USE_CLASS_PROVIDER');
        const result = provider.useClassGreetByLanguage('Welt');
        expect(result).toEqual({'useClass': 'Hallo! Welt.'});
      });
    });
  });

  describe('Combined usage', () => {
    let module: TestingModule;
    
    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          CustomDynamicModule.forRoot('Combined Root'),
          CustomDynamicModule.forFeature('Combined Feature'),
          CustomDynamicModule.register('en'),
          CustomDynamicModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async () => ({ forRootAsyncProvider: 'Combined Async' }),
          }),
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should provide all providers simultaneously', () => {
      expect(module.get('FOR_ROOT_PROVIDER')).toBe('Combined Root');
      expect(module.get('FOR_FEATURE_PROVIDER')).toBe('Combined Feature');
      expect(module.get('USE_CLASS_PROVIDER')).toBeInstanceOf(GreetEnglish);
      expect(module.get('FOR_ROOT_ASYNC_PROVIDER')).toEqual({ forRootAsyncProvider: 'Combined Async' });
      expect(module.get(CustomDynamicModuleService)).toBeDefined();
    });

    it('should work with different combinations', () => {
      const service = module.get(CustomDynamicModuleService);
      const greetProvider = module.get('USE_CLASS_PROVIDER');
      
      expect(service.checkProviderExportInDynamicModule()).toBe('This is from CustomDynamicModuleService');
      expect(greetProvider.useClassGreetByLanguage('Test')).toEqual({'useClass': 'Hello! Test.'});
    });
  });
});