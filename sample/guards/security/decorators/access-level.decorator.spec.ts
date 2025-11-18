import { Reflector } from '@nestjs/core';
import { ACCESS_LEVEL_KEY, RequireAccessLevel } from './access-level.decorator';
import { AccessLevel } from '../../enums/access-level.enum';
import 'reflect-metadata';

// Mock SetMetadata
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  SetMetadata: jest.fn((key, value) => (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata(key, value, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata(key, value, target);
    }
    return descriptor || target;
  }),
}));

describe('AccessLevel Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('ACCESS_LEVEL_KEY', () => {
    it('should have the correct key value', () => {
      expect(ACCESS_LEVEL_KEY).toBe('accessLevel');
    });
  });

  describe('RequireAccessLevel decorator', () => {
    it('should be defined', () => {
      expect(RequireAccessLevel).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof RequireAccessLevel).toBe('function');
    });

    describe('when applied to a method', () => {
      it('should set GUEST access level metadata', () => {
        class TestClass {
          @RequireAccessLevel(AccessLevel.GUEST)
          testMethod() {
            return 'test';
          }
        }

        const instance = new TestClass();
        const metadata = reflector.get(ACCESS_LEVEL_KEY, instance.testMethod);
        
        expect(metadata).toBe(AccessLevel.GUEST);
      });

      it('should set STANDARD access level metadata', () => {
        class TestClass {
          @RequireAccessLevel(AccessLevel.STANDARD)
          testMethod() {
            return 'test';
          }
        }

        const instance = new TestClass();
        const metadata = reflector.get(ACCESS_LEVEL_KEY, instance.testMethod);
        
        expect(metadata).toBe(AccessLevel.STANDARD);
      });

      it('should set PREMIUM access level metadata', () => {
        class TestClass {
          @RequireAccessLevel(AccessLevel.PREMIUM)
          testMethod() {
            return 'test';
          }
        }

        const instance = new TestClass();
        const metadata = reflector.get(ACCESS_LEVEL_KEY, instance.testMethod);
        
        expect(metadata).toBe(AccessLevel.PREMIUM);
      });

      it('should set ADMIN access level metadata', () => {
        class TestClass {
          @RequireAccessLevel(AccessLevel.ADMIN)
          testMethod() {
            return 'test';
          }
        }

        const instance = new TestClass();
        const metadata = reflector.get(ACCESS_LEVEL_KEY, instance.testMethod);
        
        expect(metadata).toBe(AccessLevel.ADMIN);
      });

      it('should set SUPER_ADMIN access level metadata', () => {
        class TestClass {
          @RequireAccessLevel(AccessLevel.SUPER_ADMIN)
          testMethod() {
            return 'test';
          }
        }

        const instance = new TestClass();
        const metadata = reflector.get(ACCESS_LEVEL_KEY, instance.testMethod);
        
        expect(metadata).toBe(AccessLevel.SUPER_ADMIN);
      });

      it('should work with multiple methods having different access levels', () => {
        class TestClass {
          @RequireAccessLevel(AccessLevel.STANDARD)
          standardMethod() {
            return 'standard';
          }

          @RequireAccessLevel(AccessLevel.ADMIN)
          adminMethod() {
            return 'admin';
          }
        }

        const instance = new TestClass();
        const standardMetadata = reflector.get(ACCESS_LEVEL_KEY, instance.standardMethod);
        const adminMetadata = reflector.get(ACCESS_LEVEL_KEY, instance.adminMethod);
        
        expect(standardMetadata).toBe(AccessLevel.STANDARD);
        expect(adminMetadata).toBe(AccessLevel.ADMIN);
      });
    });

    describe('when applied to a class', () => {
      it('should set access level metadata on class', () => {
        @RequireAccessLevel(AccessLevel.PREMIUM)
        class TestClass {
          testMethod() {
            return 'test';
          }
        }

        const metadata = reflector.get(ACCESS_LEVEL_KEY, TestClass);
        expect(metadata).toBe(AccessLevel.PREMIUM);
      });

      it('should work with different access levels on class', () => {
        @RequireAccessLevel(AccessLevel.ADMIN)
        class AdminClass {
          method() {}
        }

        @RequireAccessLevel(AccessLevel.GUEST)
        class GuestClass {
          method() {}
        }

        const adminMetadata = reflector.get(ACCESS_LEVEL_KEY, AdminClass);
        const guestMetadata = reflector.get(ACCESS_LEVEL_KEY, GuestClass);
        
        expect(adminMetadata).toBe(AccessLevel.ADMIN);
        expect(guestMetadata).toBe(AccessLevel.GUEST);
      });
    });

    describe('decorator return value', () => {
      it('should return a decorator function', () => {
        const decorator = RequireAccessLevel(AccessLevel.STANDARD);
        expect(typeof decorator).toBe('function');
      });

      it('should return different decorator functions for different access levels', () => {
        const standardDecorator = RequireAccessLevel(AccessLevel.STANDARD);
        const adminDecorator = RequireAccessLevel(AccessLevel.ADMIN);
        
        expect(standardDecorator).not.toBe(adminDecorator);
        expect(typeof standardDecorator).toBe('function');
        expect(typeof adminDecorator).toBe('function');
      });
    });

    describe('integration with Reflector', () => {
      it('should work with reflector.get to retrieve metadata', () => {
        class TestClass {
          @RequireAccessLevel(AccessLevel.PREMIUM)
          premiumMethod() {}

          regularMethod() {}
        }

        const instance = new TestClass();
        
        // Should return the access level for decorated method
        const premiumMetadata = reflector.get(ACCESS_LEVEL_KEY, instance.premiumMethod);
        expect(premiumMetadata).toBe(AccessLevel.PREMIUM);
        
        // Should return undefined for non-decorated method
        const regularMetadata = reflector.get(ACCESS_LEVEL_KEY, instance.regularMethod);
        expect(regularMetadata).toBeUndefined();
      });

      it('should work with reflector.getAllAndOverride to get method and class metadata', () => {
        @RequireAccessLevel(AccessLevel.STANDARD)
        class TestClass {
          @RequireAccessLevel(AccessLevel.ADMIN)
          adminMethod() {}

          standardMethod() {}
        }

        const instance = new TestClass();
        
        // Should get method-level metadata (ADMIN) for adminMethod
        const adminMethodMetadata = reflector.getAllAndOverride(ACCESS_LEVEL_KEY, [
          instance.adminMethod,
          TestClass
        ]);
        expect(adminMethodMetadata).toBe(AccessLevel.ADMIN);
        
        // Should get class-level metadata (STANDARD) for standardMethod
        const standardMethodMetadata = reflector.getAllAndOverride(ACCESS_LEVEL_KEY, [
          instance.standardMethod,
          TestClass
        ]);
        expect(standardMethodMetadata).toBe(AccessLevel.STANDARD);
      });
    });

    describe('edge cases', () => {
      it('should handle multiple decorators on same method', () => {
        // Note: In practice, you wouldn't apply the same decorator twice,
        // but this tests decorator behavior when multiple are applied
        class TestClass {
          @RequireAccessLevel(AccessLevel.ADMIN)     // Applied second (top decorator)
          @RequireAccessLevel(AccessLevel.STANDARD)  // Applied first (bottom decorator)
          testMethod() {}
        }

        const instance = new TestClass();
        const metadata = reflector.get(ACCESS_LEVEL_KEY, instance.testMethod);
        
        // Decorators are applied bottom-up, so STANDARD (bottom) is applied first,
        // then ADMIN (top) is applied second and overwrites the previous value
        expect(metadata).toBe(AccessLevel.ADMIN);
      });

      it('should not interfere with other metadata', () => {
        const CUSTOM_KEY = 'customKey';
        const CustomDecorator = (value: string) => (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
          if (propertyKey && descriptor) {
            Reflect.defineMetadata(CUSTOM_KEY, value, descriptor.value);
          }
          return descriptor;
        };

        class TestClass {
          @RequireAccessLevel(AccessLevel.PREMIUM)
          @CustomDecorator('custom-value')
          testMethod() {}
        }

        const instance = new TestClass();
        const accessLevelMetadata = reflector.get(ACCESS_LEVEL_KEY, instance.testMethod);
        const customMetadata = Reflect.getMetadata(CUSTOM_KEY, instance.testMethod);
        
        expect(accessLevelMetadata).toBe(AccessLevel.PREMIUM);
        expect(customMetadata).toBe('custom-value');
      });
    });

    describe('type safety', () => {
      it('should only accept valid AccessLevel enum values', () => {
        // These should compile without errors
        const validDecorators = [
          RequireAccessLevel(AccessLevel.GUEST),
          RequireAccessLevel(AccessLevel.STANDARD),
          RequireAccessLevel(AccessLevel.PREMIUM),
          RequireAccessLevel(AccessLevel.ADMIN),
          RequireAccessLevel(AccessLevel.SUPER_ADMIN),
        ];
        
        validDecorators.forEach(decorator => {
          expect(typeof decorator).toBe('function');
        });
      });
    });
  });
});
