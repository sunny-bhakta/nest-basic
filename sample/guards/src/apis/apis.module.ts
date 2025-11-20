import { Module } from "@nestjs/common";
import { DataService } from "./services/data.service";
import { CacheService } from "./services/cache.service";
import { InterceptorManagementService } from "./services/interceptor-management.service";
import { InterceptorAdminController } from "./controllers/interceptor-admin.controller";
import { DemoController } from "./controllers/demo.controller";
import { SecurityService } from "../security/security.service";

@Module({
    providers: [
        CacheService,
        InterceptorManagementService,
        DataService,
        SecurityService,
    ],
    exports: [
        // CacheService,
        // InterceptorManagementService,
        // DataService,
    ],
    controllers: [
        InterceptorAdminController,
        DemoController
    ],
})
export class ApisModule {}