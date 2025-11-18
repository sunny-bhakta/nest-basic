import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import {
  ParseIntPipe,
  ParseUUIDPipe,
  TrimPipe,
  ParseBoolPipe,
  ParseArrayPipe,
} from './transform.pipe';

describe('ParseIntPipe', () => {
  let pipe: ParseIntPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    mockMetadata = {
      type: 'query',
      metatype: String,
      data: 'page',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      pipe = new ParseIntPipe();
    });

    it('should transform valid integer string to number', () => {
      expect(pipe.transform('42', mockMetadata)).toBe(42);
      expect(pipe.transform('0', mockMetadata)).toBe(0);
      expect(pipe.transform('-10', mockMetadata)).toBe(-10);
      expect(pipe.transform('999999', mockMetadata)).toBe(999999);
    });

    it('should throw BadRequestException for invalid integer strings', () => {
      expect(() => pipe.transform('abc', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('12.34', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('12abc', mockMetadata))
        .toThrow(BadRequestException);
    });

    it('should provide meaningful error messages', () => {
      try {
        pipe.transform('invalid', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('is not a valid integer');
        expect(error.message).toContain('page');
      }
    });
  });

  describe('with optional configuration', () => {
    beforeEach(() => {
      pipe = new ParseIntPipe({ optional: true });
    });

    it('should return undefined for optional empty values', () => {
      expect(pipe.transform(undefined, mockMetadata)).toBeUndefined();
      expect(pipe.transform(null, mockMetadata)).toBeUndefined();
      expect(pipe.transform('', mockMetadata)).toBeUndefined();
    });

    it('should still validate non-empty values', () => {
      expect(pipe.transform('42', mockMetadata)).toBe(42);
      expect(() => pipe.transform('invalid', mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with range validation', () => {
    beforeEach(() => {
      pipe = new ParseIntPipe({ min: 1, max: 100 });
    });

    it('should validate values within range', () => {
      expect(pipe.transform('1', mockMetadata)).toBe(1);
      expect(pipe.transform('50', mockMetadata)).toBe(50);
      expect(pipe.transform('100', mockMetadata)).toBe(100);
    });

    it('should throw BadRequestException for values below minimum', () => {
      expect(() => pipe.transform('0', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('-1', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('0', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('below minimum 1');
      }
    });

    it('should throw BadRequestException for values above maximum', () => {
      expect(() => pipe.transform('101', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('999', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('101', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('exceeds maximum 100');
      }
    });
  });

  describe('with custom error message', () => {
    beforeEach(() => {
      pipe = new ParseIntPipe({ errorMessage: 'Custom error for page number' });
    });

    it('should use custom error message', () => {
      try {
        pipe.transform('invalid', mockMetadata);
      } catch (error) {
        expect(error.message).toBe('Custom error for page number');
      }
    });
  });
});

describe('ParseUUIDPipe', () => {
  let pipe: ParseUUIDPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    mockMetadata = {
      type: 'param',
      metatype: String,
      data: 'id',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      pipe = new ParseUUIDPipe();
    });

    it('should validate and return valid UUIDs', () => {
      const validUUIDs = [
        'a1b2c3d4-e5f6-1234-8901-abcdef123456', // v1
        'a1b2c3d4-e5f6-4234-8901-abcdef123456', // v4
        'a1b2c3d4-e5f6-5234-8901-abcdef123456', // v5
      ];

      validUUIDs.forEach(uuid => {
        expect(pipe.transform(uuid, mockMetadata)).toBe(uuid);
      });
    });

    it('should throw BadRequestException for invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345678-1234-1234-1234-12345678901', // Too short
        '12345678-1234-1234-1234-1234567890123', // Too long
        '12345678-1234-1234-1234-1234567890zz', // Invalid characters
        'a1b2c3d4e5f612348901abcdef123456', // Missing hyphens
        '',
      ];

      invalidUUIDs.forEach(uuid => {
        expect(() => pipe.transform(uuid, mockMetadata))
          .toThrow(BadRequestException);
      });
    });

    it('should provide meaningful error messages', () => {
      try {
        pipe.transform('invalid-uuid', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('is not a valid UUID');
        expect(error.message).toContain('id');
      }
    });
  });

  describe('with version validation', () => {
    beforeEach(() => {
      pipe = new ParseUUIDPipe({ version: '4' });
    });

    it('should validate specific UUID version', () => {
      const uuid4 = 'a1b2c3d4-e5f6-4234-8901-abcdef123456';
      expect(pipe.transform(uuid4, mockMetadata)).toBe(uuid4);
    });

    it('should reject wrong UUID version', () => {
      const uuid1 = 'a1b2c3d4-e5f6-1234-8901-abcdef123456';
      expect(() => pipe.transform(uuid1, mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with optional configuration', () => {
    beforeEach(() => {
      pipe = new ParseUUIDPipe({ optional: true });
    });

    it('should return undefined for empty optional values', () => {
      expect(pipe.transform(undefined, mockMetadata)).toBeUndefined();
      expect(pipe.transform(null, mockMetadata)).toBeUndefined();
      expect(pipe.transform('', mockMetadata)).toBeUndefined();
    });
  });
});

describe('TrimPipe', () => {
  let pipe: TrimPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    mockMetadata = {
      type: 'query',
      metatype: String,
      data: 'search',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      pipe = new TrimPipe();
    });

    it('should trim whitespace from strings', () => {
      expect(pipe.transform('  hello  ', mockMetadata)).toBe('hello');
      expect(pipe.transform('\t\nworld\t\n', mockMetadata)).toBe('world');
      expect(pipe.transform('   test   ', mockMetadata)).toBe('test');
    });

    it('should handle null and undefined values', () => {
      expect(pipe.transform(null, mockMetadata)).toBeNull();
      expect(pipe.transform(undefined, mockMetadata)).toBeUndefined();
    });

    it('should throw BadRequestException for non-string types', () => {
      expect(() => pipe.transform(123, mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform({}, mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with case transformation', () => {
    it('should convert to lowercase when configured', () => {
      pipe = new TrimPipe({ toLowerCase: true });
      expect(pipe.transform('  HELLO WORLD  ', mockMetadata)).toBe('hello world');
    });

    it('should convert to uppercase when configured', () => {
      pipe = new TrimPipe({ toUpperCase: true });
      expect(pipe.transform('  hello world  ', mockMetadata)).toBe('HELLO WORLD');
    });
  });

  describe('with length validation', () => {
    beforeEach(() => {
      pipe = new TrimPipe({ minLength: 3, maxLength: 10 });
    });

    it('should validate string length after trimming', () => {
      expect(pipe.transform('  hello  ', mockMetadata)).toBe('hello');
    });

    it('should throw BadRequestException for strings too short', () => {
      expect(() => pipe.transform('  hi  ', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('  hi  ', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('below minimum 3');
      }
    });

    it('should throw BadRequestException for strings too long', () => {
      expect(() => pipe.transform('  this is too long  ', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('  this is too long  ', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('exceeds maximum 10');
      }
    });
  });

  describe('with empty string transformation', () => {
    it('should transform empty strings to null when configured', () => {
      pipe = new TrimPipe({ transformEmpty: 'null' });
      expect(pipe.transform('   ', mockMetadata)).toBeNull();
    });

    it('should transform empty strings to undefined when configured', () => {
      pipe = new TrimPipe({ transformEmpty: 'undefined' });
      expect(pipe.transform('   ', mockMetadata)).toBeUndefined();
    });

    it('should keep empty strings when configured', () => {
      pipe = new TrimPipe({ transformEmpty: 'keep' });
      expect(pipe.transform('   ', mockMetadata)).toBe('');
    });
  });
});

describe('ParseBoolPipe', () => {
  let pipe: ParseBoolPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    pipe = new ParseBoolPipe();
    mockMetadata = {
      type: 'query',
      metatype: String,
      data: 'active',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should parse truthy string values to true', () => {
      expect(pipe.transform('true', mockMetadata)).toBe(true);
      expect(pipe.transform('TRUE', mockMetadata)).toBe(true);
      expect(pipe.transform('True', mockMetadata)).toBe(true);
      expect(pipe.transform('1', mockMetadata)).toBe(true);
      expect(pipe.transform('yes', mockMetadata)).toBe(true);
      expect(pipe.transform('YES', mockMetadata)).toBe(true);
    });

    it('should parse falsy string values to false', () => {
      expect(pipe.transform('false', mockMetadata)).toBe(false);
      expect(pipe.transform('FALSE', mockMetadata)).toBe(false);
      expect(pipe.transform('False', mockMetadata)).toBe(false);
      expect(pipe.transform('0', mockMetadata)).toBe(false);
      expect(pipe.transform('no', mockMetadata)).toBe(false);
      expect(pipe.transform('NO', mockMetadata)).toBe(false);
    });

    it('should return boolean values as-is', () => {
      expect(pipe.transform(true, mockMetadata)).toBe(true);
      expect(pipe.transform(false, mockMetadata)).toBe(false);
    });

    it('should throw BadRequestException for invalid boolean strings', () => {
      expect(() => pipe.transform('invalid', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('maybe', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('2', mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with optional configuration', () => {
    beforeEach(() => {
      pipe = new ParseBoolPipe({ optional: true });
    });

    it('should return undefined for empty optional values', () => {
      expect(pipe.transform(undefined, mockMetadata)).toBeUndefined();
      expect(pipe.transform(null, mockMetadata)).toBeUndefined();
      expect(pipe.transform('', mockMetadata)).toBeUndefined();
    });
  });

  describe('with custom error message', () => {
    beforeEach(() => {
      pipe = new ParseBoolPipe({ errorMessage: 'Custom boolean error' });
    });

    it('should use custom error message', () => {
      try {
        pipe.transform('invalid', mockMetadata);
      } catch (error) {
        expect(error.message).toBe('Custom boolean error');
      }
    });
  });
});

describe('ParseArrayPipe', () => {
  let pipe: ParseArrayPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    mockMetadata = {
      type: 'query',
      metatype: String,
      data: 'categories',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      pipe = new ParseArrayPipe();
    });

    it('should parse comma-separated strings to arrays', () => {
      expect(pipe.transform('a,b,c', mockMetadata)).toEqual(['a', 'b', 'c']);
      expect(pipe.transform('item1, item2, item3', mockMetadata)).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle single values', () => {
      expect(pipe.transform('single', mockMetadata)).toEqual(['single']);
    });

    it('should return arrays as-is', () => {
      const array = ['a', 'b', 'c'];
      expect(pipe.transform(array, mockMetadata)).toEqual(array);
    });

    it('should throw BadRequestException for invalid types', () => {
      expect(() => pipe.transform(123, mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform({}, mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with custom separator', () => {
    beforeEach(() => {
      pipe = new ParseArrayPipe({ separator: '|' });
    });

    it('should use custom separator', () => {
      expect(pipe.transform('a|b|c', mockMetadata)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('with type transformation', () => {
    it('should transform items to numbers', () => {
      pipe = new ParseArrayPipe({ itemType: 'number' });
      expect(pipe.transform('1,2,3', mockMetadata)).toEqual([1, 2, 3]);
    });

    it('should transform items to booleans', () => {
      pipe = new ParseArrayPipe({ itemType: 'boolean' });
      expect(pipe.transform('true,false,1', mockMetadata)).toEqual([true, false, true]);
    });

    it('should throw BadRequestException for invalid type conversion', () => {
      pipe = new ParseArrayPipe({ itemType: 'number' });
      expect(() => pipe.transform('a,b,c', mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with size validation', () => {
    beforeEach(() => {
      pipe = new ParseArrayPipe({ minItems: 2, maxItems: 4 });
    });

    it('should validate array size', () => {
      expect(pipe.transform('a,b', mockMetadata)).toEqual(['a', 'b']);
      expect(pipe.transform('a,b,c,d', mockMetadata)).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should throw BadRequestException for arrays too small', () => {
      expect(() => pipe.transform('a', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('a', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('below minimum 2');
      }
    });

    it('should throw BadRequestException for arrays too large', () => {
      expect(() => pipe.transform('a,b,c,d,e', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('a,b,c,d,e', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('exceeds maximum 4');
      }
    });
  });

  describe('with unique validation', () => {
    beforeEach(() => {
      pipe = new ParseArrayPipe({ unique: true });
    });

    it('should allow arrays with unique values', () => {
      expect(pipe.transform('a,b,c', mockMetadata)).toEqual(['a', 'b', 'c']);
    });

    it('should throw BadRequestException for arrays with duplicates', () => {
      expect(() => pipe.transform('a,b,a', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('a,b,a', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('unique values');
      }
    });
  });

  describe('with optional configuration', () => {
    beforeEach(() => {
      pipe = new ParseArrayPipe({ optional: true });
    });

    it('should return undefined for empty optional values', () => {
      expect(pipe.transform(undefined, mockMetadata)).toBeUndefined();
      expect(pipe.transform(null, mockMetadata)).toBeUndefined();
      expect(pipe.transform('', mockMetadata)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      pipe = new ParseArrayPipe();
    });

    it('should handle empty strings in arrays', () => {
      expect(pipe.transform('a,,c', mockMetadata)).toEqual(['a', '', 'c']);
    });

    it('should trim whitespace from items', () => {
      expect(pipe.transform(' a , b , c ', mockMetadata)).toEqual(['a', 'b', 'c']);
    });
  });
});