import { Module } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { CatalogController } from "./catalog.controller";
import { SecurityModule } from "src/security/security.module";
// import { CacheControlInterceptor } from "src/interceptors/response.interceptor";
import { InterceptorsModule } from "../interceptors/interceptors.module";
import { PerformanceInterceptor } from "../interceptors/performance.interceptor";
// import { CacheInterceptor } from "src/interceptors/cache.interceptor";
// import { CacheInterceptor, InterceptorsModule } from "src/interceptors";
// import { PerformanceInterceptor } from "src/interceptors/logging.interceptor";


@Module({
    imports: [SecurityModule, InterceptorsModule],
    providers: [CatalogService],
    controllers: [CatalogController],
    exports: [CatalogService],
})

export class CatalogModule {}