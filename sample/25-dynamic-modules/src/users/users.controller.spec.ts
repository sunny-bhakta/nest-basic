import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './user.service';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockForFeatureProvider: string;
  let mockForFeatureAsyncProvider: any;
  let mockUseExistingProvider: any;
  let mockUseClassProvider: any;

  beforeEach(async () => {
    mockUsersService = {
      sayHello: jest.fn().mockReturnValue('Hello from UsersService!'),
    } as any;

    mockForFeatureProvider = 'Mock FOR_FEATURE_PROVIDER';
    mockForFeatureAsyncProvider = { forFeatureAsyncProvider: 'Mock Feature Async' };
    mockUseExistingProvider = {
      sayHello: jest.fn().mockReturnValue('Hello from UseExisting!'),
    };
    mockUseClassProvider = {
      useClassGreetByLanguage: jest.fn().mockReturnValue('Hallo! Mock greeting.'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: 'FOR_FEATURE_PROVIDER',
          useValue: mockForFeatureProvider,
        },
        {
          provide: 'FOR_FEATURE_ASYNC_PROVIDER',
          useValue: mockForFeatureAsyncProvider,
        },
        {
          provide: 'USE_EXISTING_PROVIDER',
          useValue: mockUseExistingProvider,
        },
        {
          provide: 'USE_CLASS_PROVIDER',
          useValue: mockUseClassProvider,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getForFeatureMessage', () => {
    it('should return FOR_FEATURE_PROVIDER value', () => {
      const result = controller.getForFeatureMessage();
      expect(result).toBe(mockForFeatureProvider);
    });

    it('should return a string', () => {
      const result = controller.getForFeatureMessage();
      expect(typeof result).toBe('string');
    });
  });

  describe('getForFeatureAsyncMessage', () => {
    it('should return FOR_FEATURE_ASYNC_PROVIDER value', () => {
      const result = controller.getForFeatureAsyncMessage();
      expect(result).toEqual(mockForFeatureAsyncProvider);
    });

    it('should handle null values gracefully', () => {
      const moduleWithNullProvider = Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: 'FOR_FEATURE_PROVIDER', useValue: mockForFeatureProvider },
          { provide: 'FOR_FEATURE_ASYNC_PROVIDER', useValue: null },
          { provide: 'USE_EXISTING_PROVIDER', useValue: mockUseExistingProvider },
          { provide: 'USE_CLASS_PROVIDER', useValue: mockUseClassProvider },
        ],
      });
      
      expect(() => controller.getForFeatureAsyncMessage()).not.toThrow();
    });
  });

  describe('useClassMessage', () => {
    it('should call useClassGreetByLanguage with "de"', () => {
      controller.useClassMessage();
      expect(mockUseClassProvider.useClassGreetByLanguage).toHaveBeenCalledWith('de');
    });

    it('should return greeting message', () => {
      const result = controller.useClassMessage();
      expect(result).toBe('Hallo! Mock greeting.');
    });
  });

  describe('sameInstaceButDifferentToken', () => {
    it('should call both service methods', () => {
      controller.sameInstaceButDifferentToken();
      expect(mockUsersService.sayHello).toHaveBeenCalled();
      expect(mockUseExistingProvider.sayHello).toHaveBeenCalled();
    });

    it('should return object with both responses', () => {
      const result = controller.sameInstaceButDifferentToken();
      expect(result).toEqual({
        default: 'Hello from UsersService!',
        use_existing: 'Hello from UseExisting!'
      });
    });

    it('should demonstrate different token usage', () => {
      const result = controller.sameInstaceButDifferentToken();
      expect(result).toHaveProperty('default');
      expect(result).toHaveProperty('use_existing');
      expect(typeof result.default).toBe('string');
      expect(typeof result.use_existing).toBe('string');
    });
  });
});