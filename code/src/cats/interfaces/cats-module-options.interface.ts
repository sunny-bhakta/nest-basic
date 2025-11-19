import { ModuleMetadata, Type } from '@nestjs/common';

export interface CatsModuleOptions {
  /**
   * Default cats to initialize the service with
   */
  defaultCats?: Array<{ name: string; age: number }>;
  
  /**
   * Storage type for cats data
   */
  storageType?: 'memory' | 'file' | 'database';
  
  /**
   * Maximum number of cats allowed
   */
  maxCats?: number;
  
  /**
   * Enable logging for cat operations
   */
  enableLogging?: boolean;
}

export interface CatsOptionsFactory {
  createCatsOptions(): Promise<CatsModuleOptions> | CatsModuleOptions;
}

export interface CatsModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<CatsOptionsFactory>;
  useClass?: Type<CatsOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<CatsModuleOptions> | CatsModuleOptions;
  inject?: any[];
}