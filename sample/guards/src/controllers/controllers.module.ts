import { Module } from '@nestjs/common';
import { ServicesModule } from '../services/services.module';
import { InterceptorAdminController } from './interceptor-admin.controller';
import { DemoController } from './demo.controller';

/**
 * Controllers module that provides all application controllers
 */
@Module({
  imports: [
    ServicesModule, // Import services for dependency injection
  ],
  controllers: [
    InterceptorAdminController,
    DemoController,
  ],
})
export class ControllersModule {}