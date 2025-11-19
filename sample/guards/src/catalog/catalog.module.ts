import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { CatalogController } from "./catalog.controller";
import { SecurityModule } from "src/security/security.module";

@Module({
    imports: [SecurityModule],
    providers: [CatalogService],
    controllers: [CatalogController],
    exports: [CatalogService],
})

export class CatalogModule {}