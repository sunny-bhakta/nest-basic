import { Test, TestingModule } from '@nestjs/testing';
import { CustomDynamicModuleService } from './customdynamicmodule.service';

describe('CustomDynamicModuleService', () => {
  let service: CustomDynamicModuleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomDynamicModuleService],
    }).compile();

    service = module.get<CustomDynamicModuleService>(CustomDynamicModuleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkProviderExportInDynamicModule', () => {
    it('should return expected message', () => {
      const result = service.checkProviderExportInDynamicModule();
      expect(result).toBe('This is from CustomDynamicModuleService');
    });

    it('should return a string', () => {
      const result = service.checkProviderExportInDynamicModule();
      expect(typeof result).toBe('string');
    });

    it('should not return empty string', () => {
      const result = service.checkProviderExportInDynamicModule();
      expect(result).not.toBe('');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return consistent results on multiple calls', () => {
      const result1 = service.checkProviderExportInDynamicModule();
      const result2 = service.checkProviderExportInDynamicModule();
      expect(result1).toBe(result2);
    });
  });
});