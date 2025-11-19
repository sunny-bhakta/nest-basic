import { Module } from "@nestjs/common";
import { CustomDynamicModule } from "../customdynamicmodule/customdynamicmodule.module";
import { UsersController } from "./users.controller";
import { UsersService } from "./user.service";

@Module({
    imports: [
        CustomDynamicModule.forFeature({'forFeatureProvider': 'From For Feature Module'}), 
        CustomDynamicModule.forFeatureAsync({
            imports: [],
            useFactory: async (_) => {
                return { forFeatureAsyncProvider: "From Feature Async Module" };
            },
            inject: [],
        }),
        CustomDynamicModule.register("de"),
    ],
    controllers: [UsersController],
    exports: ["USE_EXISTING_PROVIDER"],
    providers: [
        UsersService,
        /**
         * The `useExisting` provider configuration allows you to map the token `"USE_EXISTING_PROVIDER"`
         * to an existing provider, in this case, `UsersService`. This means that whenever `"USE_EXISTING_PROVIDER"`
         * is injected, the existing instance of `UsersService` will be used.
         *
         * @example
         * // Injecting "USE_EXISTING_PROVIDER" will provide the same instance as UsersService
         * constructor(@Inject('USE_EXISTING_PROVIDER') private readonly usersService: UsersService) {}
         */
        {
            provide: "USE_EXISTING_PROVIDER",
            useExisting: UsersService,
        }
    ],

})

export class UsersModule { }