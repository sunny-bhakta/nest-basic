import { Test, TestingModule } from '@nestjs/testing';
import { UsersModule } from './users.module';
import { UsersController } from './users.controller';
import { UsersService } from './user.service';

describe('UsersModule', () => {
  let module: TestingModule;
  let usersController: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    usersController = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide UsersController', () => {
    expect(usersController).toBeDefined();
    expect(usersController).toBeInstanceOf(UsersController);
  });

  it('should provide UsersService', () => {
    expect(usersService).toBeDefined();
    expect(usersService).toBeInstanceOf(UsersService);
  });

  it('should provide FOR_FEATURE_PROVIDER from CustomDynamicModule', () => {
    const provider = module.get('FOR_FEATURE_PROVIDER');
    expect(provider).toBeDefined();
  });

  it('should provide FOR_FEATURE_ASYNC_PROVIDER from CustomDynamicModule', () => {
    const provider = module.get('FOR_FEATURE_ASYNC_PROVIDER');
    expect(provider).toBeDefined();
    expect(provider).toHaveProperty('forFeatureAsyncProvider');
  });

  it('should provide USE_CLASS_PROVIDER from CustomDynamicModule.register("de")', () => {
    const provider = module.get('USE_CLASS_PROVIDER');
    expect(provider).toBeDefined();
    expect(typeof provider.useClassGreetByLanguage).toBe('function');
    
    const result = provider.useClassGreetByLanguage('Test');
    expect(result).toEqual({ useClass: 'Hallo! Test.' });
  });

  it('should provide USE_EXISTING_PROVIDER mapping to UsersService', () => {
    const existingProvider = module.get('USE_EXISTING_PROVIDER');
    expect(existingProvider).toBeDefined();
    expect(existingProvider).toBe(usersService);
  });

  it('should export USE_EXISTING_PROVIDER', () => {
    const exportedProvider = module.get('USE_EXISTING_PROVIDER');
    expect(exportedProvider).toBeDefined();
  });

  describe('Integration with CustomDynamicModule', () => {
    it('should have access to all imported dynamic module providers', () => {
      expect(() => module.get('FOR_FEATURE_PROVIDER')).not.toThrow();
      expect(() => module.get('FOR_FEATURE_ASYNC_PROVIDER')).not.toThrow();
      expect(() => module.get('USE_CLASS_PROVIDER')).not.toThrow();
    });

    it('should work with controller injections', () => {
      expect(usersController.getForFeatureMessage()).toBeDefined();
      expect(usersController.getForFeatureAsyncMessage()).toBeDefined();
      expect(usersController.useClassMessage()).toBeDefined();
      expect(usersController.sameInstaceButDifferentToken()).toBeDefined();
    });
  });

  describe('Provider functionality', () => {
    it('should demonstrate useExisting pattern correctly', () => {
      const usersService = module.get<UsersService>(UsersService);
      const useExistingProvider = module.get('USE_EXISTING_PROVIDER');
      
      expect(usersService.sayHello()).toBe(useExistingProvider.sayHello());
    });

    it('should handle async provider correctly', () => {
      const asyncProvider = module.get('FOR_FEATURE_ASYNC_PROVIDER');
      expect(asyncProvider).toEqual({
        forFeatureAsyncProvider: 'From Feature Async Module'
      });
    });
  });
});