import { Test, TestingModule } from '@nestjs/testing';
import { CatsModule } from './cats.module';
import { CatsService } from './cats.service';
import { CatsModuleRefService } from './cats-module-ref.service';
import { CatsController } from './cats.controller';
import { CatsPaginationController } from './cats-pagination.controller';
import { CatsGateway } from './cats.gateway';
import { CATS_MODULE_OPTIONS } from './cats.constants';
import { MiddlewareConsumer } from '@nestjs/common';

describe('CatsModule', () => {
    it('should create a dynamic module with forRoot', async () => {
        const options = { enabled: true };
        const dynamicModule = CatsModule.forRoot(options as any);

        expect(dynamicModule.module).toBe(CatsModule);
        expect(dynamicModule.controllers).toEqual([
            CatsController,
            CatsPaginationController,
        ]);
        expect(dynamicModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: CATS_MODULE_OPTIONS,
                    useValue: options,
                }),
                CatsService,
                CatsModuleRefService,
                CatsGateway,
            ])
        );
        expect(dynamicModule.exports).toEqual([
            CatsService,
            CatsModuleRefService,
        ]);
    });

    it('should create a dynamic module with forFeature', () => {
        const dynamicModule = CatsModule.forFeature();

        expect(dynamicModule.module).toBe(CatsModule);
        expect(dynamicModule.controllers).toEqual([
            CatsController,
            CatsPaginationController,
        ]);
        expect(dynamicModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: CATS_MODULE_OPTIONS,
                    useValue: {},
                }),
                CatsService,
                CatsModuleRefService,
                CatsGateway,
            ])
        );
        expect(dynamicModule.exports).toEqual([
            CatsService,
            CatsModuleRefService,
        ]);
    });

    it('should create a dynamic module with forRootAsync using useFactory', async () => {
        const asyncOptions = {
            useFactory: jest.fn().mockReturnValue({ asyncOption: 'value' }),
            inject: [],
        };
        const dynamicModule = CatsModule.forRootAsync(asyncOptions);

        expect(dynamicModule.module).toBe(CatsModule);
        expect(dynamicModule.controllers).toEqual([
            CatsController,
            CatsPaginationController,
        ]);
        expect(dynamicModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: CATS_MODULE_OPTIONS,
                    useFactory: asyncOptions.useFactory,
                    inject: [],
                }),
                CatsService,
                CatsModuleRefService,
                CatsGateway,
            ])
        );
        expect(dynamicModule.exports).toEqual([
            CatsService,
            CatsModuleRefService,
        ]);
    });

    it('should create a dynamic module with forRootAsync using useClass', () => {
        class TestCatsOptionsFactory {
            createCatsOptions() {
                return { test: true };
            }
        }
        const asyncOptions = {
            useClass: TestCatsOptionsFactory,
        };
        const dynamicModule = CatsModule.forRootAsync(asyncOptions as any);

        expect(dynamicModule.providers).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    provide: CATS_MODULE_OPTIONS,
                    useFactory: expect.any(Function),
                    inject: [TestCatsOptionsFactory],
                }),
                {
                    provide: TestCatsOptionsFactory,
                    useClass: TestCatsOptionsFactory,
                },
                CatsService,
                CatsModuleRefService,
                CatsGateway,
            ])
        );
    });

    it('should apply LoggerMiddleware for CatsController in configure', () => {
        const consumer = {
            apply: jest.fn().mockReturnThis(),
            forRoutes: jest.fn(),
        } as any;

        const module = new CatsModule();
        module.configure(consumer);

        expect(consumer.apply).toHaveBeenCalledWith(expect.any(Function));
        expect(consumer.forRoutes).toHaveBeenCalledWith(CatsController);
    });
});