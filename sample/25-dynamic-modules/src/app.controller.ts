import { Controller, Get, Inject } from '@nestjs/common';
import { CustomDynamicModuleService } from './customdynamicmodule/customdynamicmodule.service';

@Controller()
export class AppController {
  constructor(
    @Inject('FOR_ROOT_PROVIDER') private readonly forRootProvider: string,
    @Inject('FOR_ROOT_ASYNC_PROVIDER') private readonly forRootAsyncProvider: any,
    private readonly customDynamicService: CustomDynamicModuleService,
  ) {}

  
  @Get('for-root')
  forRootMessage(): any {
    return this.forRootProvider;
  }

  @Get('for-root-async')
  forRootAsyncMessage(): any {
    return this.forRootAsyncProvider;
  }

  @Get('check-provider-export-in-dynamic-module')
  checkProviderExportInDynamicModule(): any {
    return {
      "checkProviderExportInDynamicModule": this.customDynamicService.checkProviderExportInDynamicModule(),
    };
  }
}