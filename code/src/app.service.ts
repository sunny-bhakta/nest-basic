import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  onModuleInit() {
    console.log('Module initialized');
  }
  
  onModuleDestroy() {
    console.log('Module destroyed');
  }

  getHello(): string {
    return 'Hello World! 🚀 NestJS with Dynamic Modules and ModuleRef';
  }
}