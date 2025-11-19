import { DynamicModule, MiddlewareConsumer, Module, NestModule, Provider } from '@nestjs/common';
import { CatsController } from './cats.controller';
import { CatsPaginationController } from './cats-pagination.controller';
import { CatsGateway } from './cats.gateway';
import { CatsService } from './cats.service';
import { CatsModuleRefService } from './cats-module-ref.service';
import { LoggerMiddleware } from '../logger/logger.middleware';
import { CatsModuleOptions, CatsModuleAsyncOptions, CatsOptionsFactory } from './interfaces/cats-module-options.interface';
import { CATS_MODULE_OPTIONS } from './cats.constants';

@Module({})
export class CatsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(CatsController);
  }

  /**
   * Create a dynamic module with synchronous configuration
   * @param options Configuration options for the cats module
   */
  static forRoot(options: CatsModuleOptions = {}): DynamicModule {
    return {
      module: CatsModule,
      controllers: [CatsController, CatsPaginationController],
      providers: [
        {
          provide: CATS_MODULE_OPTIONS,
          useValue: options,
        },
        CatsService,
        CatsModuleRefService,
        CatsGateway,
      ],
      exports: [CatsService, CatsModuleRefService],
    };
  }

  /**
   * Create a dynamic module with asynchronous configuration
   * @param options Async configuration options for the cats module
   */
  static forRootAsync(options: CatsModuleAsyncOptions): DynamicModule {
    return {
      module: CatsModule,
      imports: options.imports || [],
      controllers: [CatsController, CatsPaginationController],
      providers: [
        ...this.createAsyncProviders(options),
        CatsService,
        CatsModuleRefService,
        CatsGateway,
      ],
      exports: [CatsService, CatsModuleRefService],
    };
  }

  private static createAsyncProviders(options: CatsModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass!,
        useClass: options.useClass!,
      },
    ];
  }

  private static createAsyncOptionsProvider(options: CatsModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: CATS_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    return {
      provide: CATS_MODULE_OPTIONS,
      useFactory: async (optionsFactory: CatsOptionsFactory) =>
        await optionsFactory.createCatsOptions(),
      inject: [options.useExisting! || options.useClass!],
    };
  }

  /**
   * Create a simple module without configuration for backward compatibility
   */
  static forFeature(): DynamicModule {
    return {
      module: CatsModule,
      controllers: [CatsController, CatsPaginationController],
      providers: [
        {
          provide: CATS_MODULE_OPTIONS,
          useValue: {},
        },
        CatsService,
        CatsModuleRefService,
        CatsGateway,
      ],
      exports: [CatsService, CatsModuleRefService],
    };
  }
}
