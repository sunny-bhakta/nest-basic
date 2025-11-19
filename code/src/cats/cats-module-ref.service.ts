import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CatsService } from './cats.service';
import { CATS_MODULE_OPTIONS } from './cats.constants';
import type { CatsModuleOptions } from './interfaces/cats-module-options.interface';

export interface ServiceInfo {
  name: string;
  found: boolean;
  instance?: string;
  methods?: string[];
  value?: any;
}

@Injectable()
export class CatsModuleRefService {
  private readonly logger = new Logger(CatsModuleRefService.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * Get CatsService instance using ModuleRef
   */
  getCatsServiceInstance(): CatsService {
    try {
      const catsService = this.moduleRef.get(CatsService, { strict: false });
      this.logger.log('Successfully retrieved CatsService via ModuleRef');
      return catsService;
    } catch (error) {
      this.logger.error('Failed to get CatsService via ModuleRef', error);
      throw new NotFoundException('CatsService not found in module container');
    }
  }

  /**
   * Get the configuration options for the cats module
   */
  getCatsModuleOptions(): CatsModuleOptions {
    try {
      const options = this.moduleRef.get<CatsModuleOptions>(CATS_MODULE_OPTIONS, { strict: false });
      this.logger.log('Successfully retrieved CatsModuleOptions via ModuleRef');
      return options;
    } catch (error) {
      this.logger.error('Failed to get CatsModuleOptions via ModuleRef', error);
      throw new NotFoundException('CatsModuleOptions not found in module container');
    }
  }

  /**
   * Demonstrate lazy loading a provider
   */
  async getCatsServiceAsync(): Promise<CatsService> {
    try {
      // Use get() for already instantiated providers
      const catsService = this.moduleRef.get(CatsService, { strict: false });
      this.logger.log('Async retrieval of CatsService successful');
      return catsService;
    } catch (error) {
      this.logger.error('Async retrieval of CatsService failed', error);
      throw error;
    }
  }

  /**
   * Create a new instance (not recommended for singletons, but useful for demonstration)
   */
  async createCatsServiceInstance(): Promise<CatsService> {
    try {
      // This creates a new instance, not using the singleton from DI container
      const options = this.getCatsModuleOptions();
      const newInstance = new CatsService(options);
      this.logger.log('Created new CatsService instance via ModuleRef');
      return newInstance;
    } catch (error) {
      this.logger.error('Failed to create new CatsService instance', error);
      throw error;
    }
  }

  /**
   * Check if a provider exists in the module
   */
  hasProvider(token: any): boolean {
    try {
      this.moduleRef.get(token, { strict: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all cats using ModuleRef
   */
  getAllCatsViaModuleRef() {
    const catsService = this.getCatsServiceInstance();
    const cats = catsService.getCats();
    this.logger.log(`Retrieved ${cats.length} cats via ModuleRef`);
    return {
      source: 'ModuleRef',
      count: cats.length,
      cats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get module configuration info
   */
  getModuleInfo() {
    const options = this.getCatsModuleOptions();
    const catsService = this.getCatsServiceInstance();
    const storageInfo = catsService.getStorageInfo();

    return {
      moduleConfiguration: options,
      storageInfo,
      providers: {
        hasCatsService: this.hasProvider(CatsService),
        hasCatsOptions: this.hasProvider(CATS_MODULE_OPTIONS),
      },
      retrievedVia: 'ModuleRef',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Demonstrate accessing multiple services through ModuleRef
   */
  getServicesInfo() {
    const services: ServiceInfo[] = [];

    // Try to get CatsService
    try {
      const catsService = this.moduleRef.get(CatsService, { strict: false });
      services.push({
        name: 'CatsService',
        found: true,
        instance: catsService.constructor.name,
        methods: Object.getOwnPropertyNames(Object.getPrototypeOf(catsService))
          .filter(name => name !== 'constructor' && typeof catsService[name] === 'function'),
      });
    } catch {
      services.push({ name: 'CatsService', found: false });
    }

    // Try to get configuration
    try {
      const options = this.moduleRef.get(CATS_MODULE_OPTIONS, { strict: false });
      services.push({
        name: 'CATS_MODULE_OPTIONS',
        found: true,
        value: options,
      });
    } catch {
      services.push({ name: 'CATS_MODULE_OPTIONS', found: false });
    }

    return {
      discoveredServices: services,
      totalFound: services.filter(s => s.found).length,
      retrievedAt: new Date().toISOString(),
    };
  }

  /**
   * Demonstrate conditional provider access
   */
  conditionalAccess(providerToken: string) {
    const knownProviders = {
      'CatsService': CatsService,
      'CATS_MODULE_OPTIONS': CATS_MODULE_OPTIONS,
    };

    const token = knownProviders[providerToken];
    if (!token) {
      return {
        error: 'Unknown provider token',
        availableTokens: Object.keys(knownProviders),
      };
    }

    try {
      const instance = this.moduleRef.get(token, { strict: false });
      return {
        providerToken,
        found: true,
        instance: instance?.constructor?.name || typeof instance,
        value: token === CATS_MODULE_OPTIONS ? instance : 'Instance retrieved',
      };
    } catch (error) {
      return {
        providerToken,
        found: false,
        error: error.message,
      };
    }
  }

  /**
   * Demonstrate accessing provider with error handling
   */
  safeGet<T>(token: any, defaultValue?: T): T | null {
    try {
      return this.moduleRef.get<T>(token, { strict: false });
    } catch (error) {
      this.logger.warn(`Failed to get provider ${token}: ${error.message}`);
      return defaultValue || null;
    }
  }
}