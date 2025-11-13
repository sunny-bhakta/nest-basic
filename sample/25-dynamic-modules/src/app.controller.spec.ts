import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { CustomDynamicModuleService } from './customdynamicmodule/customdynamicmodule.service';

describe('AppController', () => {
  let controller: AppController;
  let mockCustomDynamicModuleService: jest.Mocked<CustomDynamicModuleService>;
  let mockUseClassProvider: any;
  let mockForRootProvider: string;
  let mockForRootAsyncProvider: any;

  beforeEach(async () => {
    // Create mock objects
    mockCustomDynamicModuleService = {
      checkProviderExportInDynamicModule: jest.fn().mockReturnValue('Mock service response'),
    } as any;

    mockUseClassProvider = {
      useClassGreetByLanguage: jest.fn().mockReturnValue('Hallo! Mock response.'),
    };

    mockForRootProvider = 'Mock FOR_ROOT_PROVIDER';
    mockForRootAsyncProvider = { "forRootAsyncProvider": 'Mock Async Provider' };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: CustomDynamicModuleService,
          useValue: mockCustomDynamicModuleService,
        },
        {
          provide: 'USE_CLASS_PROVIDER',
          useValue: mockUseClassProvider,
        },
        {
          provide: 'FOR_ROOT_PROVIDER',
          useValue: mockForRootProvider,
        },
        {
          provide: 'FOR_ROOT_ASYNC_PROVIDER',
          useValue: mockForRootAsyncProvider,
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('forRootMessage', () => {
    it('should return FOR_ROOT_PROVIDER value', () => {
      const result = controller.forRootMessage();
      expect(result).toBe(mockForRootProvider);
    });
  });

  describe('forRootAsyncMessage', () => {
    it('should return FOR_ROOT_ASYNC_PROVIDER value', () => {
      const result = controller.forRootAsyncMessage();
      expect(result).toEqual(mockForRootAsyncProvider);
    });
  });

  describe('checkProviderExportInDynamicModule', () => {
    it('should call service method', () => {
      controller.checkProviderExportInDynamicModule();
      expect(mockCustomDynamicModuleService.checkProviderExportInDynamicModule).toHaveBeenCalled();
    });

    it('should return service response wrapped in object', () => {
      const result = controller.checkProviderExportInDynamicModule();
      expect(result).toEqual({
        checkProviderExportInDynamicModule: 'Mock service response'
      });
    });
  });
});