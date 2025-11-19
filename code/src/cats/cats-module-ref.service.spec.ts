import { Test, TestingModule } from '@nestjs/testing';
import { CatsModuleRefService } from './cats-module-ref.service';
import { ModuleRef } from '@nestjs/core';
import { CatsService } from './cats.service';
import { CATS_MODULE_OPTIONS } from './cats.constants';
import type { CatsModuleOptions } from './interfaces/cats-module-options.interface';
import { NotFoundException, Logger } from '@nestjs/common';

const mockCatsModuleOptions: CatsModuleOptions = { storageType: 'memory', maxCats: 10 };
const mockCatsService = {
  getCats: jest.fn().mockReturnValue([{ name: 'Tom' }, { name: 'Jerry' }]),
  getStorageInfo: jest.fn().mockReturnValue({ type: 'memory', count: 2 }),
  constructor: { name: 'CatsService' },
};

const mockModuleRef = {
  get: jest.fn(),
};

describe('CatsModuleRefService', () => {
  let service: CatsModuleRefService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatsModuleRefService,
        { provide: ModuleRef, useValue: mockModuleRef },
      ],
    }).compile();

    service = module.get<CatsModuleRefService>(CatsModuleRefService);
  });

  describe('getCatsServiceInstance', () => {
    it('should return CatsService instance', () => {
      mockModuleRef.get.mockReturnValueOnce(mockCatsService);
      expect(service.getCatsServiceInstance()).toBe(mockCatsService);
    });

    it('should throw NotFoundException if not found', () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      expect(() => service.getCatsServiceInstance()).toThrow(NotFoundException);
    });
  });

  describe('getCatsModuleOptions', () => {
    it('should return CatsModuleOptions', () => {
      mockModuleRef.get.mockReturnValueOnce(mockCatsModuleOptions);
      expect(service.getCatsModuleOptions()).toBe(mockCatsModuleOptions);
    });

    it('should throw NotFoundException if not found', () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      expect(() => service.getCatsModuleOptions()).toThrow(NotFoundException);
    });
  });

  describe('getCatsServiceAsync', () => {
    it('should return CatsService instance asynchronously', async () => {
      mockModuleRef.get.mockResolvedValueOnce(mockCatsService);
      mockModuleRef.get.mockReturnValueOnce(mockCatsService);
      await expect(service.getCatsServiceAsync()).resolves.toBe(mockCatsService);
    });

    it('should throw error if not found', async () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      await expect(service.getCatsServiceAsync()).rejects.toThrow('not found');
    });
  });

  describe('createCatsServiceInstance', () => {
    it('should create new CatsService instance', async () => {
      mockModuleRef.get.mockReturnValueOnce(mockCatsModuleOptions);
      const catsServiceSpy = jest.spyOn(CatsService.prototype, 'constructor');
      const instance = await service.createCatsServiceInstance();
      expect(instance).toBeInstanceOf(CatsService);
      catsServiceSpy.mockRestore();
    });

    it('should throw error if options not found', async () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      await expect(service.createCatsServiceInstance()).rejects.toThrow();
    });
  });

  describe('hasProvider', () => {
    it('should return true if provider exists', () => {
      mockModuleRef.get.mockReturnValueOnce(mockCatsService);
      expect(service.hasProvider(CatsService)).toBe(true);
    });

    it('should return false if provider does not exist', () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      expect(service.hasProvider(CatsService)).toBe(false);
    });
  });

  describe('getAllCatsViaModuleRef', () => {
    it('should return all cats info', () => {
      mockModuleRef.get.mockReturnValueOnce(mockCatsService);
      const result = service.getAllCatsViaModuleRef();
      expect(result.source).toBe('ModuleRef');
      expect(result.count).toBe(2);
      expect(result.cats).toEqual([{ name: 'Tom' }, { name: 'Jerry' }]);
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('getModuleInfo', () => {
    it('should return module info', () => {
      mockModuleRef.get
        .mockReturnValueOnce(mockCatsModuleOptions)
        .mockReturnValueOnce(mockCatsService);
      const result = service.getModuleInfo();
      expect(result.moduleConfiguration).toBe(mockCatsModuleOptions);
      expect(result.storageInfo).toEqual({ type: 'memory', count: 2 });
      expect(result.providers.hasCatsService).toBe(true);
      expect(result.providers.hasCatsOptions).toBe(true);
      expect(result.retrievedVia).toBe('ModuleRef');
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('getServicesInfo', () => {
    it('should return discovered services info', () => {
      mockModuleRef.get
        .mockReturnValueOnce(mockCatsService)
        .mockReturnValueOnce(mockCatsModuleOptions);
      const result = service.getServicesInfo();
      expect(result.discoveredServices.length).toBe(2);
      expect(result.totalFound).toBe(2);
      expect(typeof result.retrievedAt).toBe('string');
    });

    it('should handle missing services', () => {
      mockModuleRef.get
        .mockImplementationOnce(() => { throw new Error('not found'); })
        .mockImplementationOnce(() => { throw new Error('not found'); });
      const result = service.getServicesInfo();
      expect(result.discoveredServices[0].found).toBe(false);
      expect(result.discoveredServices[1].found).toBe(false);
      expect(result.totalFound).toBe(0);
    });
  });

  describe('conditionalAccess', () => {
    it('should return info for known provider', () => {
      mockModuleRef.get.mockReturnValueOnce(mockCatsService);
      const result = service.conditionalAccess('CatsService');
      expect(result.providerToken).toBe('CatsService');
      expect(result.found).toBe(true);
      expect(result.instance).toBe('CatsService');
    });

    it('should return error for unknown provider', () => {
      const result = service.conditionalAccess('UnknownProvider');
      expect(result.error).toBe('Unknown provider token');
      expect(result.availableTokens).toContain('CatsService');
    });

    it('should handle provider not found', () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      const result = service.conditionalAccess('CatsService');
      expect(result.found).toBe(false);
      expect(result.error).toBe('not found');
    });
  });

  describe('safeGet', () => {
    it('should return provider if found', () => {
      mockModuleRef.get.mockReturnValueOnce(mockCatsService);
      expect(service.safeGet(CatsService)).toBe(mockCatsService);
    });

    it('should return default value if not found', () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      expect(service.safeGet(CatsService, 'default')).toBe('default');
    });

    it('should return null if not found and no default', () => {
      mockModuleRef.get.mockImplementationOnce(() => { throw new Error('not found'); });
      expect(service.safeGet(CatsService)).toBeNull();
    });
  });
});