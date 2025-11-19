import { Module } from '@nestjs/common';
import { InterceptorsModule } from '../interceptors/interceptors.module';
import { SecurityModule } from '../security/security.module';
import { CacheService } from './cache.service';
import { InterceptorManagementService } from './interceptor-management.service';
import { DataService } from './data.service';

/**
 * Services module that provides business logic services
 * Depends on InterceptorsModule for interceptor injection
 */
@Module({
  imports: [
    InterceptorsModule, // Import to get access to interceptor instances
    SecurityModule,     // Import for security decorators to work
  ],
  providers: [
    CacheService,
    InterceptorManagementService,
    DataService,
  ],
  exports: [
    CacheService,
    InterceptorManagementService,
    DataService,
  ],
})
export class ServicesModule {}