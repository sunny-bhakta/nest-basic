import { SKIP_AUTH_KEY, SkipAuth } from './skip-auth.decorator';
import { Reflector } from '@nestjs/core';
import 'reflect-metadata';

describe('SkipAuth Decorator', () => {
    let reflector: Reflector;

    beforeEach(() => {
        reflector = new Reflector();
    });

    describe('SKIP_AUTH_KEY', () => {
        it('should have the correct key value', () => {
            expect(SKIP_AUTH_KEY).toBe('skipAuth');
        });
    });

    describe('SkipAuth decorator', () => {
        it('should set metadata with SKIP_AUTH_KEY to true on method', () => {
            // Define a test class and apply the decorator to its method
            class TestClass {
                @SkipAuth()
                testMethod() {}
                
                regularMethod() {}
            }

            // Check if metadata is set correctly using direct Reflect.getMetadata
            const skipAuthValue = Reflect.getMetadata(SKIP_AUTH_KEY, TestClass.prototype.testMethod);
            const regularMethodValue = Reflect.getMetadata(SKIP_AUTH_KEY, TestClass.prototype.regularMethod);

            expect(skipAuthValue).toBe(true);
            expect(regularMethodValue).toBeUndefined();
        });

        it('should set metadata with SKIP_AUTH_KEY to true on class', () => {
            // Define a test class and apply the decorator to the class
            @SkipAuth()
            class TestClass {
                testMethod() {}
            }

            class RegularClass {
                testMethod() {}
            }

            // Check if metadata is set correctly using direct Reflect.getMetadata
            const skipAuthValue = Reflect.getMetadata(SKIP_AUTH_KEY, TestClass);
            const regularClassValue = Reflect.getMetadata(SKIP_AUTH_KEY, RegularClass);

            expect(skipAuthValue).toBe(true);
            expect(regularClassValue).toBeUndefined();
        });

        it('should work with Reflect.getMetadata directly', () => {
            class TestClass {
                @SkipAuth()
                testMethod() {}
            }

            // Direct metadata check (how NestJS internally works)
            const value = Reflect.getMetadata(SKIP_AUTH_KEY, TestClass.prototype.testMethod);
            expect(value).toBe(true);
        });

        it('should return the correct decorator function', () => {
            const decorator = SkipAuth();
            
            // The decorator should be a function
            expect(typeof decorator).toBe('function');
            
            // Define a class and method, get the descriptor
            class ManualTestClass {
                testMethod() {}
            }
            

            expect(typeof decorator).toBe('function');
            
            // Apply it manually to a target
            const target = ManualTestClass.prototype;
            const propertyKey = 'testMethod';
            const descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);

            decorator(target, propertyKey, descriptor!);
            
            // Check metadata was set
            const value = Reflect.getMetadata(SKIP_AUTH_KEY, target[propertyKey]);
            expect(value).toBe(true);
        });

        it('should integrate with Reflector.getAllAndOverride', () => {
            class TestController {
                @SkipAuth()
                skipAuthMethod() {}
                
                regularMethod() {}
            }

            // Simulate what BearerTokenGuard does
            const skipAuthMethod = TestController.prototype.skipAuthMethod;
            const regularMethod = TestController.prototype.regularMethod;
            
            const skipAuthResult = reflector.getAllAndOverride(SKIP_AUTH_KEY, [
                skipAuthMethod,
                TestController
            ]);
            
            const regularResult = reflector.getAllAndOverride(SKIP_AUTH_KEY, [
                regularMethod,
                TestController
            ]);

            expect(skipAuthResult).toBe(true);
            expect(regularResult).toBeFalsy();
        });
    });
});