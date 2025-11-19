import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ValidationPipe, StrictValidationPipe } from './validation.pipe';
import { IsString, IsEmail, IsNumber, Min, MaxLength, IsOptional, } from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';

// Test DTO classes
class TestUserDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(18)
  @Type(() => Number)
  age: number;

  @IsOptional()
  @IsString()
  bio?: string;
}

class StrictTestDto {
  @Expose()
  @IsString()
  allowedField: string;

  @Expose()
  @IsNumber()
  @Type(() => Number)
  numberField: number;

  // This field should be excluded in strict mode (no @Expose())
  hiddenField?: string;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationPipe],
    }).compile();

    pipe = module.get<ValidationPipe>(ValidationPipe);
    mockMetadata = {
      type: 'body',
      metatype: TestUserDto,
      data: 'testData',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transform method', () => {
    it('should validate and transform valid data successfully', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: '25', // String that should be converted to number
        bio: 'Optional bio',
      };

      const result = await pipe.transform(validData, mockMetadata);

      expect(result).toBeInstanceOf(TestUserDto);
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(25); // Should be converted to number
      expect(result.bio).toBe('Optional bio');
    });

    it('should validate required fields and throw BadRequestException for missing data', async () => {
      const invalidData = {
        name: 'John Doe',
        // Missing required email and age
      };

      await expect(pipe.transform(invalidData, mockMetadata))
        .rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(invalidData, mockMetadata);
      } catch (error) {
        expect(error.getResponse()).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
          message: expect.arrayContaining([
            expect.stringContaining('email'),
            expect.stringContaining('age'),
          ]),
        });
      }
    });

    it('should validate field constraints and provide detailed error messages', async () => {
      const invalidData = {
        name: 'A'.repeat(51), // Exceeds maxLength of 50
        email: 'invalid-email',
        age: 15, // Below minimum age of 18
      };

      await expect(pipe.transform(invalidData, mockMetadata))
        .rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(invalidData, mockMetadata);
      } catch (error) {
        const response = error.getResponse();
        expect(response.message).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/name.*must be shorter than or equal to 50 characters/),
            expect.stringMatching(/email.*must be an email/),
            expect.stringMatching(/age.*must not be less than 18/),
          ])
        );
      }
    });

    it('should strip unknown properties with whitelist: true', async () => {
      const dataWithExtraFields = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        unknownField: 'should be stripped',
        anotherUnknown: 'also stripped',
      };

      const result = await pipe.transform(dataWithExtraFields, mockMetadata);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(25);
      expect(result).not.toHaveProperty('unknownField');
      expect(result).not.toHaveProperty('anotherUnknown');
    });

    it('should handle optional fields correctly', async () => {
      const dataWithoutOptional = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 30,
        // bio is optional and not provided
      };

      const result = await pipe.transform(dataWithoutOptional, mockMetadata);

      expect(result.name).toBe('Jane Doe');
      expect(result.email).toBe('jane@example.com');
      expect(result.age).toBe(30);
      expect(result.bio).toBeUndefined();
    });

    it('should throw BadRequestException for null or undefined value', async () => {
      await expect(pipe.transform(null, mockMetadata))
        .rejects.toThrow(BadRequestException);

      await expect(pipe.transform(undefined, mockMetadata))
        .rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(null, mockMetadata);
      } catch (error) {
        expect(error.message).toBe('Validation failed: Request body is required');
      }
    });

    it('should skip validation for primitive types', async () => {
      const primitiveMetadata: ArgumentMetadata = {
        type: 'query',
        metatype: String,
        data: 'search',
      };

      const result = await pipe.transform('test string', primitiveMetadata);
      expect(result).toBe('test string');
    });

    it('should skip validation when metatype is missing', async () => {
      const noMetatypeMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: undefined,
        data: 'test',
      };

      const testData = { test: 'data' };
      const result = await pipe.transform(testData, noMetatypeMetadata);
      expect(result).toEqual(testData);
    });

    it('should handle nested validation errors', async () => {
      // This would require a more complex DTO with nested objects
      // For now, testing the formatValidationErrors method indirectly
      const invalidData = {
        name: '', // Empty string should fail validation
        email: 'not-an-email',
        age: 'not-a-number',
      };

      try {
        await pipe.transform(invalidData, mockMetadata);
      } catch (error) {
        const response = error.getResponse();
        expect(Array.isArray(response.message)).toBe(true);
        expect(response.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('private methods', () => {
    it('should correctly identify types to validate', () => {
      // Access private method for testing
      const toValidate = (pipe as any).toValidate;

      expect(toValidate(TestUserDto)).toBe(true);
      expect(toValidate(String)).toBe(false);
      expect(toValidate(Number)).toBe(false);
      expect(toValidate(Boolean)).toBe(false);
      expect(toValidate(Array)).toBe(false);
      expect(toValidate(Object)).toBe(false);
    });

    it('should format validation errors correctly', () => {
      const mockErrors = [
        {
          property: 'name',
          constraints: {
            isString: 'name must be a string',
            maxLength: 'name must be shorter than or equal to 50 characters',
          },
        },
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
      ];

      const formatValidationErrors = (pipe as any).formatValidationErrors;
      const result = formatValidationErrors(mockErrors);

      expect(result).toEqual([
        'name must be a string',
        'name must be shorter than or equal to 50 characters',
        'email must be an email',
      ]);
    });

    it('should handle nested validation errors in formatting', () => {
      const mockNestedErrors = [
        {
          property: 'user',
          children: [
            {
              property: 'name',
              constraints: {
                isString: 'name must be a string',
              },
            },
            {
              property: 'email',
              constraints: {
                isEmail: 'email must be an email',
              },
            },
          ],
        },
      ];

      const formatValidationErrors = (pipe as any).formatValidationErrors;
      const result = formatValidationErrors(mockNestedErrors);

      expect(result).toEqual([
        'user.name must be a string',
        'user.email must be an email',
      ]);
    });
  });

  describe('logging behavior', () => {
    it('should log validation failures', async () => {
      const loggerSpy = jest.spyOn(pipe['logger'], 'warn');
      const invalidData = {
        name: 'John',
        email: 'invalid-email',
        age: 15,
      };

      try {
        await pipe.transform(invalidData, mockMetadata);
      } catch (error) {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Validation failed for TestUserDto')
      );
    });
  });
});

describe('StrictValidationPipe', () => {
  let pipe: StrictValidationPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StrictValidationPipe],
    }).compile();

    pipe = module.get<StrictValidationPipe>(StrictValidationPipe);
    mockMetadata = {
      type: 'body',
      metatype: StrictTestDto,
      data: 'testData',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transform method', () => {
    it('should validate and transform valid data with strict mode', async () => {
      const validData = {
        allowedField: 'test value',
        numberField: '42', // String should be converted to number
        // hiddenField is intentionally omitted to match strict DTO
      };

      const result = await pipe.transform(validData, mockMetadata);

      expect(result).toBeInstanceOf(StrictTestDto);
      expect(result.allowedField).toBe('test value');
      expect(result.numberField).toBe(42);
      expect(result).not.toHaveProperty('hiddenField');
    });

    it('should enforce strict validation with detailed error messages', async () => {
      const invalidData = {
        allowedField: 123, // Should be string
        numberField: 'not-a-number',
      };

      await expect(pipe.transform(invalidData, mockMetadata))
        .rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(invalidData, mockMetadata);
      } catch (error) {
        const response = error.getResponse();
        expect(response.error).toBe('Validation Error');
        expect(Array.isArray(response.message)).toBe(true);
        expect(response.message).toEqual(
          expect.arrayContaining([
            expect.stringContaining('allowedField:'),
            expect.stringContaining('numberField:'),
          ])
        );
      }
    });

    it('should not skip missing properties in strict mode', async () => {
      const incompleteData = {
        allowedField: 'test',
        // Missing numberField
      };

      await expect(pipe.transform(incompleteData, mockMetadata))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle null/undefined values correctly', async () => {
      await expect(pipe.transform(null, mockMetadata))
        .rejects.toThrow(BadRequestException);

      await expect(pipe.transform(undefined, mockMetadata))
        .rejects.toThrow(BadRequestException);

      try {
        await pipe.transform(null, mockMetadata);
      } catch (error) {
        expect(error.message).toBe('Request body is required');
      }
    });

    it('should skip validation for primitive types', async () => {
      const primitiveMetadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      const result = await pipe.transform('test-id', primitiveMetadata);
      expect(result).toBe('test-id');
    });
  });

  describe('private methods', () => {
    it('should format detailed errors correctly', () => {
      const mockErrors = [
        {
          property: 'field1',
          constraints: {
            isString: 'field1 must be a string',
            maxLength: 'field1 must be shorter',
          },
        },
        {
          property: 'field2',
          constraints: {
            isNumber: 'field2 must be a number',
          },
        },
      ];

      const formatDetailedErrors = (pipe as any).formatDetailedErrors;
      const result = formatDetailedErrors(mockErrors);

      expect(result).toEqual([
        'field1: field1 must be a string',
        'field1: field1 must be shorter',
        'field2: field2 must be a number',
      ]);
    });

    it('should handle nested errors in detailed formatting', () => {
      const mockNestedErrors = [
        {
          property: 'parent',
          constraints: {
            isObject: 'parent must be an object',
          },
          children: [
            {
              property: 'child',
              constraints: {
                isString: 'child must be a string',
              },
            },
          ],
        },
      ];

      const formatDetailedErrors = (pipe as any).formatDetailedErrors;
      const result = formatDetailedErrors(mockNestedErrors);

      expect(result).toEqual([
        'parent: parent must be an object',
        'parent.child: child must be a string',
      ]);
    });
  });

  describe('logging behavior', () => {
    it('should log strict validation failures', async () => {
      const loggerSpy = jest.spyOn(pipe['logger'], 'warn');
      const invalidData = {
        allowedField: 123, // Invalid type
      };

      try {
        await pipe.transform(invalidData, mockMetadata);
      } catch (error) {
        // Expected to throw
      }

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Strict validation failed')
      );
    });
  });
});