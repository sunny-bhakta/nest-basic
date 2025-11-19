import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { CatsService } from './cats/cats.service';
import { CatsModuleRefService } from './cats/cats-module-ref.service';
import { CATS_MODULE_OPTIONS } from './cats/cats.constants';

@Injectable()
export class AppModuleRefService implements OnModuleInit {
  private readonly logger = new Logger(AppModuleRefService.name);

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    this.logger.log('🚀 App Module initialized - demonstrating ModuleRef access to dynamic CatsModule');
    
    // Demonstrate accessing the dynamic module providers
    await this.demonstrateModuleRefAccess();
  }

  private async demonstrateModuleRefAccess() {
    try {
      // 1. Access CatsService via ModuleRef
      const catsService = this.moduleRef.get(CatsService, { strict: false });
      this.logger.log('✅ Successfully accessed CatsService via ModuleRef');
      
      const cats = catsService.getCats();
      this.logger.log(`📋 Found ${cats.length} cats: ${cats.map(c => c.name).join(', ')}`);

      // 2. Access configuration options
      const config = this.moduleRef.get(CATS_MODULE_OPTIONS, { strict: false });
      this.logger.log('✅ Successfully accessed CatsModuleOptions via ModuleRef');
      this.logger.log(`⚙️ Configuration: storage=${config.storageType}, maxCats=${config.maxCats}, logging=${config.enableLogging}`);

      // 3. Access the ModuleRef service itself
      const moduleRefService = this.moduleRef.get(CatsModuleRefService, { strict: false });
      this.logger.log('✅ Successfully accessed CatsModuleRefService via ModuleRef');
      
      const moduleInfo = moduleRefService.getModuleInfo();
      this.logger.log(`🔍 Module info retrieved: ${moduleInfo.storageInfo.count} cats in ${moduleInfo.storageInfo.type} storage`);

    } catch (error) {
      this.logger.error('❌ Failed to access dynamic module providers via ModuleRef', error);
    }
  }

  /**
   * Public method to demonstrate ModuleRef access from other parts of the app
   */
  getDynamicModuleInfo() {
    try {
      const catsService = this.moduleRef.get(CatsService, { strict: false });
      const config = this.moduleRef.get(CATS_MODULE_OPTIONS, { strict: false });
      const moduleRefService = this.moduleRef.get(CatsModuleRefService, { strict: false });

      return {
        timestamp: new Date().toISOString(),
        accessMethod: 'ModuleRef from AppModule',
        providers: {
          catsService: {
            available: !!catsService,
            catsCount: catsService?.getCats().length || 0,
          },
          config: {
            available: !!config,
            storageType: config?.storageType,
            maxCats: config?.maxCats,
          },
          moduleRefService: {
            available: !!moduleRefService,
            servicesDiscovered: moduleRefService?.getServicesInfo().totalFound || 0,
          },
        },
      };
    } catch (error) {
      return {
        error: 'Failed to access dynamic module providers',
        details: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Demonstrate conditional provider access
   */
  checkProviderAvailability() {
    const providers = [
      { name: 'CatsService', token: CatsService },
      { name: 'CATS_MODULE_OPTIONS', token: CATS_MODULE_OPTIONS },
      { name: 'CatsModuleRefService', token: CatsModuleRefService },
    ];

    const results = providers.map(provider => {
      try {
        const instance = this.moduleRef.get(provider.token, { strict: false });
        return {
          name: provider.name,
          available: true,
          type: typeof instance,
          constructorName: instance?.constructor?.name,
        };
      } catch {
        return {
          name: provider.name,
          available: false,
        };
      }
    });

    return {
      totalProviders: providers.length,
      availableProviders: results.filter(r => r.available).length,
      results,
      checkedAt: new Date().toISOString(),
    };
  }
}