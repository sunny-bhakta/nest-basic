import { ValidationPipe } from './validation.pipe';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { 
  IsString, 
  IsInt, 
  Min, 
  Max, 
  IsOptional, 
  IsEmail,
  Length,
  IsNotEmpty,
  IsBoolean,
  IsArray,
  ValidateNested
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Mock class-validator and class-transformer
jest.mock('class-validator');
jest.mock('class-transformer');

const mockValidate = validate as jest.MockedFunction<typeof validate>;
const mockPlainToClass = plainToClass as jest.MockedFunction<typeof plainToClass>;

// Test DTOs for validation scenarios
class TestUserDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 50)
  name: string;

  @IsInt()
  @Min(18)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  age: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

class TestPaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}

class TestNestedDto {
  @ValidateNested()
  @Type(() => TestUserDto)
  user: TestUserDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestUserDto)
  users: TestUserDto[];
}

class InvalidDto {
  // No validation decorators
  someProperty: any;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    pipe = new ValidationPipe();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Pipe instantiation', () => {
    it('should be defined', () => {
      expect(pipe).toBeDefined();
    });

    it('should be an instance of ValidationPipe', () => {
      expect(pipe).toBeInstanceOf(ValidationPipe);
    });

    it('should implement PipeTransform interface', () => {
      expect(pipe.transform).toBeDefined();
      expect(typeof pipe.transform).toBe('function');
    });
  });

  describe('transform method - Valid scenarios', () => {
    it('should transform and validate a valid DTO successfully', async () => {
      // Arrange
      const value = { name: 'John Doe', age: '25', email: 'john@example.com' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { name: 'John Doe', age: 25, email: 'john@example.com' };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).toHaveBeenCalledWith(TestUserDto, value);
      expect(mockValidate).toHaveBeenCalledWith(transformedObject);
      expect(result).toEqual(transformedObject);
    });

    it('should handle pagination DTO with defaults', async () => {
      // Arrange
      const value = {};
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: TestPaginationDto,
        data: undefined,
      };
      const transformedObject = { page: 1, limit: 10 };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).toHaveBeenCalledWith(TestPaginationDto, value);
      expect(mockValidate).toHaveBeenCalledWith(transformedObject);
      expect(result).toEqual(transformedObject);
    });

    it('should handle optional properties correctly', async () => {
      // Arrange
      const value = { name: 'Jane', age: '30', email: 'jane@example.com', bio: 'Developer' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { 
        name: 'Jane', 
        age: 30, 
        email: 'jane@example.com', 
        bio: 'Developer' 
      };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(transformedObject);
    });

    it('should handle nested validation successfully', async () => {
      // Arrange
      const value = {
        user: { name: 'John', age: '25', email: 'john@example.com' },
        users: [
          { name: 'Jane', age: '30', email: 'jane@example.com' },
          { name: 'Bob', age: '35', email: 'bob@example.com' }
        ]
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestNestedDto,
        data: undefined,
      };
      const transformedObject = {
        user: { name: 'John', age: 25, email: 'john@example.com' },
        users: [
          { name: 'Jane', age: 30, email: 'jane@example.com' },
          { name: 'Bob', age: 35, email: 'bob@example.com' }
        ]
      };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(transformedObject);
    });
  });

  describe('transform method - Skip validation scenarios', () => {
    it('should skip validation for primitive types', async () => {
      // Arrange
      const value = 'test-string';
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: undefined,
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).not.toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
      expect(result).toBe(value);
    });

    it('should skip validation for Number type', async () => {
      // Arrange
      const value = 123;
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: Number,
        data: undefined,
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).not.toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
      expect(result).toBe(value);
    });

    it('should skip validation for Boolean type', async () => {
      // Arrange
      const value = true;
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: Boolean,
        data: undefined,
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).not.toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
      expect(result).toBe(value);
    });

    it('should skip validation for Array type', async () => {
      // Arrange
      const value = [1, 2, 3];
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: Array,
        data: undefined,
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).not.toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
      expect(result).toBe(value);
    });

    it('should skip validation for Object type', async () => {
      // Arrange
      const value = { test: 'value' };
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: Object,
        data: undefined,
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).not.toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
      expect(result).toBe(value);
    });

    it('should skip validation when metatype is undefined', async () => {
      // Arrange
      const value = { test: 'value' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: undefined,
        data: undefined,
      };

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).not.toHaveBeenCalled();
      expect(mockValidate).not.toHaveBeenCalled();
      expect(result).toBe(value);
    });
  });

  describe('transform method - Validation error scenarios', () => {
    it('should throw BadRequestException when validation fails', async () => {
      // Arrange
      const value = { name: '', age: '15', email: 'invalid-email' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { name: '', age: 15, email: 'invalid-email' };
      const validationErrors = [
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
            length: 'name must be longer than or equal to 2 characters'
          }
        },
        {
          property: 'age',
          constraints: {
            min: 'age must not be less than 18'
          }
        },
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email'
          }
        }
      ];

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue(validationErrors as any);

      // Act & Assert
      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
      expect(mockPlainToClass).toHaveBeenCalledWith(TestUserDto, value);
      expect(mockValidate).toHaveBeenCalledWith(transformedObject);
    });

    it('should throw BadRequestException with single validation error', async () => {
      // Arrange
      const value = { name: 'John', age: '15', email: 'john@example.com' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { name: 'John', age: 15, email: 'john@example.com' };
      const validationErrors = [
        {
          property: 'age',
          constraints: {
            min: 'age must not be less than 18'
          }
        }
      ];

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue(validationErrors as any);

      // Act & Assert
      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle nested validation errors', async () => {
      // Arrange
      const value = {
        user: { name: '', age: '15', email: 'invalid' },
        users: [{ name: 'Jane', age: '30', email: 'jane@example.com' }]
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestNestedDto,
        data: undefined,
      };
      const transformedObject = {
        user: { name: '', age: 15, email: 'invalid' },
        users: [{ name: 'Jane', age: 30, email: 'jane@example.com' }]
      };
      const validationErrors = [
        {
          property: 'user',
          children: [
            {
              property: 'name',
              constraints: {
                isNotEmpty: 'name should not be empty'
              }
            },
            {
              property: 'age',
              constraints: {
                min: 'age must not be less than 18'
              }
            },
            {
              property: 'email',
              constraints: {
                isEmail: 'email must be an email'
              }
            }
          ]
        }
      ];

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue(validationErrors as any);

      // Act & Assert
      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle validation errors with empty constraints', async () => {
      // Arrange
      const value = { name: 'John', age: '25', email: 'john@example.com' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { name: 'John', age: 25, email: 'john@example.com' };
      const validationErrors = [
        {
          property: 'name',
          constraints: {}
        }
      ];

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue(validationErrors as any);

      // Act & Assert
      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });
  });

  describe('transform method - Edge cases', () => {
    it('should handle null value input', async () => {
      // Arrange
      const value = null;
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = {};

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).toHaveBeenCalledWith(TestUserDto, null);
      expect(result).toEqual(transformedObject);
    });

    it('should handle undefined value input', async () => {
      // Arrange
      const value = undefined;
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = {};

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).toHaveBeenCalledWith(TestUserDto, undefined);
      expect(result).toEqual(transformedObject);
    });

    it('should handle empty object input', async () => {
      // Arrange
      const value = {};
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = {};

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(transformedObject);
    });

    it('should handle array input', async () => {
      // Arrange
      const value = [
        { name: 'John', age: '25', email: 'john@example.com' },
        { name: 'Jane', age: '30', email: 'jane@example.com' }
      ];
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = [
        { name: 'John', age: 25, email: 'john@example.com' },
        { name: 'Jane', age: 30, email: 'jane@example.com' }
      ];

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(transformedObject);
    });
  });

  describe('toValidate method (private method behavior)', () => {
    it('should validate custom DTO classes', async () => {
      // Arrange
      const value = { name: 'John', age: '25', email: 'john@example.com' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };

      mockPlainToClass.mockReturnValue(value);
      mockValidate.mockResolvedValue([]);

      // Act
      await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).toHaveBeenCalled();
      expect(mockValidate).toHaveBeenCalled();
    });

    it('should not validate when metatype is a built-in type', async () => {
      // Test multiple built-in types
      const builtInTypes = [String, Boolean, Number, Array, Object];
      
      for (const type of builtInTypes) {
        const value = 'test';
        const metadata: ArgumentMetadata = {
          type: 'param',
          metatype: type,
          data: undefined,
        };

        const result = await pipe.transform(value, metadata);

        expect(result).toBe(value);
        expect(mockPlainToClass).not.toHaveBeenCalled();
        expect(mockValidate).not.toHaveBeenCalled();
        
        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('Error message building', () => {
    it('should build proper error message from validation errors', async () => {
      // Arrange
      const value = { name: '', age: '15', email: 'invalid-email' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { name: '', age: 15, email: 'invalid-email' };
      const validationErrors = [
        {
          property: 'name',
          constraints: {
            isNotEmpty: 'name should not be empty',
            length: 'name must be longer than or equal to 2 characters'
          }
        },
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email'
          }
        }
      ];

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue(validationErrors as any);

      // Act & Assert
      try {
        await pipe.transform(value, metadata);
        fail('Expected BadRequestException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('Integration scenarios', () => {
    it('should handle real-world pagination DTO validation', async () => {
      // Arrange
      const value = { page: '2', limit: '50' };
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: TestPaginationDto,
        data: undefined,
      };
      const transformedObject = { page: 2, limit: 50 };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(transformedObject);
      expect(mockPlainToClass).toHaveBeenCalledWith(TestPaginationDto, value);
      expect(mockValidate).toHaveBeenCalledWith(transformedObject);
    });

    it('should handle pagination validation errors', async () => {
      // Arrange
      const value = { page: '0', limit: '200' };
      const metadata: ArgumentMetadata = {
        type: 'query',
        metatype: TestPaginationDto,
        data: undefined,
      };
      const transformedObject = { page: 0, limit: 200 };
      const validationErrors = [
        {
          property: 'page',
          constraints: {
            min: 'page must not be less than 1'
          }
        },
        {
          property: 'limit',
          constraints: {
            max: 'limit must not be greater than 100'
          }
        }
      ];

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue(validationErrors as any);

      // Act & Assert
      await expect(pipe.transform(value, metadata)).rejects.toThrow(BadRequestException);
    });

    it('should handle complex nested object validation', async () => {
      // Arrange
      const value = {
        user: { name: 'John Doe', age: '25', email: 'john@example.com' },
        users: [
          { name: 'Jane Smith', age: '30', email: 'jane@example.com' },
          { name: 'Bob Johnson', age: '35', email: 'bob@example.com' }
        ]
      };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestNestedDto,
        data: undefined,
      };
      const transformedObject = {
        user: { name: 'John Doe', age: 25, email: 'john@example.com' },
        users: [
          { name: 'Jane Smith', age: 30, email: 'jane@example.com' },
          { name: 'Bob Johnson', age: 35, email: 'bob@example.com' }
        ]
      };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const result = await pipe.transform(value, metadata);

      // Assert
      expect(result).toEqual(transformedObject);
      expect(mockValidate).toHaveBeenCalledWith(transformedObject);
    });
  });

  describe('Performance and behavior verification', () => {
    it('should call plainToClass and validate exactly once', async () => {
      // Arrange
      const value = { name: 'John', age: '25', email: 'john@example.com' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { name: 'John', age: 25, email: 'john@example.com' };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      await pipe.transform(value, metadata);

      // Assert
      expect(mockPlainToClass).toHaveBeenCalledTimes(1);
      expect(mockValidate).toHaveBeenCalledTimes(1);
    });

    it('should handle async validation correctly', async () => {
      // Arrange
      const value = { name: 'John', age: '25', email: 'john@example.com' };
      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: TestUserDto,
        data: undefined,
      };
      const transformedObject = { name: 'John', age: 25, email: 'john@example.com' };

      mockPlainToClass.mockReturnValue(transformedObject);
      mockValidate.mockResolvedValue([]);

      // Act
      const resultPromise = pipe.transform(value, metadata);

      // Assert
      expect(resultPromise).toBeInstanceOf(Promise);
      const result = await resultPromise;
      expect(result).toEqual(transformedObject);
    });

    it('should preserve original value when skipping validation', async () => {
      // Arrange
      const originalValue = { complex: { nested: { object: 'value' } } };
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: Object,
        data: undefined,
      };

      // Act
      const result = await pipe.transform(originalValue, metadata);

      // Assert
      expect(result).toBe(originalValue); // Same reference
      expect(result).toEqual(originalValue); // Same content
    });
  });
});