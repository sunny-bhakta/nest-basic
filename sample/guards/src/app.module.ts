import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    SecurityModule,
    CatalogModule
  ],
  controllers: [],
})
export class AppModule { }
