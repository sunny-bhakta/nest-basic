import { DynamicModule, Module, } from "@nestjs/common";
import { IAsyncFactoryOptions, IForFeatureAsync, IForRootAsyncResult } from "../interface/interface";
import { GreetEnglish } from "../greet/greet.english";
import { GreetGerman } from "../greet/greet.german";
import { CustomDynamicModuleService } from "./customdynamicmodule.service";

@Module({})
export class CustomDynamicModule {

    /**
     * Registers a global, synchronously-configured provider for application-wide configuration.
     *
     * @remarks
     * Use this method when you need to provide configuration values that are required globally
     * and do not depend on asynchronous operations. This is typically used in the root module
     * to set up values such as database connection strings, API keys, or other global settings.
     * The provider registered by this method is available throughout the application and should
     * only be used once in the root module.
     *
     * @param option - The value to provide for the global configuration.
     * @returns A dynamic module configured with the global provider.
     *
     * @example
     * // Example usage in the root module:
     * CustomDynamicModule.forRoot('my-global-api-key');
     */
    static forRoot(option: any): DynamicModule {
        return {
            module: CustomDynamicModule,
            providers: [
                CustomDynamicModuleService,
                {
                    provide: "FOR_ROOT_PROVIDER",
                    useValue: option,
                },
            ],
            exports: [CustomDynamicModuleService, "FOR_ROOT_PROVIDER"],
        };
    }

    /**
     * Registers a feature-scoped, synchronously-configured provider for contextual or module-level configuration.
     *
     * @remarks
     * Use this method when you need to provide configuration values that are specific to a feature module
     * and do not require asynchronous operations. This is useful for scenarios where each feature module
     * may require its own distinct configuration, such as table names, API endpoints, or other contextual values.
     * The provider registered by this method is scoped to the importing module, allowing for contextual overrides.
     *
     * @param option - The value to provide for the feature-specific configuration.
     * @returns A dynamic module configured with the feature-specific provider.
     *
     * @example
     * // Example usage in a feature module:
     * CustomDynamicModule.forFeature('users_table');
     */
    static forFeature(option: any): DynamicModule {
        return {
            module: CustomDynamicModule,
            providers: [
                {
                    provide: "FOR_FEATURE_PROVIDER",
                    useValue: option,
                },
            ],
            exports: ["FOR_FEATURE_PROVIDER"],
        };
    }

    /**
     * Registers a global, asynchronously-configured provider for application-wide configuration.
     *
     * @remarks
     * Use this method when you need to provide global configuration values that depend on asynchronous operations,
     * such as fetching secrets from a remote service or loading configuration from an external source at startup.
     * This is typically used in the root module to set up values like database connection strings or API keys
     * that are required throughout the application.
     *
     * The asynchronous factory pattern enables dependency injection of other providers or services into the factory function.
     * The provider registered by this method is available globally and should only be used once in the root module.
     *
     * @param options - Asynchronous factory options for configuring the module. Includes the factory function,
     *                  dependencies to inject, and optional imports.
     * @returns A dynamic module configured asynchronously for global setup.
     *
     * @example
     * // Example usage in the root module:
     * CustomDynamicModule.forRootAsync({
     *   imports: [ConfigModule],
     *   inject: [ConfigService],
     *   useFactory: async (configService: ConfigService) => {
     *     const dbConnectionString = await configService.getDatabaseConnectionString();
     *     return { dbConnectionString };
     *   },
     * });
     */
    static forRootAsync(options: IAsyncFactoryOptions<IForRootAsyncResult>): DynamicModule {
        return {
            module: CustomDynamicModule,
            imports: options.imports || [],
            providers: [
                {
                    provide: "FOR_ROOT_ASYNC_PROVIDER",
                    useFactory: options.useFactory,
                    inject: options.inject || [], //to allow for dependency injection here is config service injected
                },
            ],
            exports: ["FOR_ROOT_ASYNC_PROVIDER"],
        };
    }

    /**
     * Registers a dynamic, asynchronously-configured provider for feature or module-level configuration.
     *
     * @remarks
     * Use this method when you need to provide feature-specific configuration values that depend on asynchronous operations,
     * such as fetching data from a remote API or loading configuration from an external source. This is useful for
     * scenarios where each feature module may require its own distinct configuration, and those values are not available
     * synchronously at application startup.
     *
     * The provider registered by this method is scoped to the importing module, allowing for contextual overrides.
     * The asynchronous factory pattern enables dependency injection of other providers or services into the factory function.
     *
     * @param options - Asynchronous factory options for configuring the feature/module. Includes the factory function,
     *                  dependencies to inject, and optional imports.
     * @returns A dynamic module configured asynchronously for feature- or module-level setup.
     *
     * @example
     * // Example usage in a feature module:
     * CustomDynamicModule.forFeatureAsync({
     *   imports: [ConfigModule],
     *   inject: [ConfigService],
     *   useFactory: async (configService: ConfigService) => {
     *     const endpoint = await configService.getFeatureEndpoint();
     *     return { endpoint };
     *   },
     * });
     */
    static forFeatureAsync(options: IAsyncFactoryOptions<IForFeatureAsync>): DynamicModule {
        return {
            module: CustomDynamicModule,
            imports: options.imports || [],
            providers: [
                {
                    provide: "FOR_FEATURE_ASYNC_PROVIDER",
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
            ],
            exports: ["FOR_FEATURE_ASYNC_PROVIDER"],
        };
    }

    /**
     * Registers a language-specific greeting provider for use within the module.
     *
     * @remarks
     * This method allows feature modules to register a provider based on the selected language.
     * It demonstrates the use of the `useClass` provider pattern for contextual or feature-specific
     * dependency injection. The registered provider can be injected elsewhere in the application
     * to deliver language-specific functionality.
     *
     * @param language - The language to use for the greeting provider. Accepts "en" (English) or "de" (German).
     * @returns A dynamic module with the appropriate greeting provider registered.
     *
     * @example
     * // Register English greeting provider
     * CustomDynamicModule.register("en");
     *
     * // Register German greeting provider
     * CustomDynamicModule.register("de");
     */
    static register(language: "en" | "de"): DynamicModule {
        const useClass = language === "en" ? GreetEnglish : GreetGerman;
        return {
            module: CustomDynamicModule,
            providers: [
                {
                    provide: "USE_CLASS_PROVIDER",
                    useClass,
                },
            ],
            exports: ["USE_CLASS_PROVIDER"],
        };
    }
}