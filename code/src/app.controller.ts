import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { AppModuleRefService } from './app-module-ref.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly appModuleRefService: AppModuleRefService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get welcome message', description: 'Returns a simple welcome message from the application' })
  @ApiResponse({ status: 200, description: 'Welcome message returned successfully', type: String })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('module-ref/dynamic-module-access')
  @ApiOperation({ 
    summary: 'Get dynamic module information', 
    description: 'Demonstrates accessing dynamic module providers using ModuleRef service' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Dynamic module information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        dynamicModuleProviders: { type: 'array', items: { type: 'string' } },
        moduleInfo: { type: 'object' }
      }
    }
  })
  getDynamicModuleAccess() {
    return this.appModuleRefService.getDynamicModuleInfo();
  }

  @Get('module-ref/provider-availability')
  @ApiOperation({ 
    summary: 'Check provider availability', 
    description: 'Checks the availability of various providers in the module context using ModuleRef' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Provider availability information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        availableProviders: { type: 'array', items: { type: 'string' } },
        providerStatus: { type: 'object' }
      }
    }
  })
  getProviderAvailability() {
    return this.appModuleRefService.checkProviderAvailability();
  }
}
