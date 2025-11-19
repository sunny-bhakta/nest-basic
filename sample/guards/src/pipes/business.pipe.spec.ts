import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentMetadata, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AccessLevelValidationPipe,
  SecuritySanitizationPipe,
  PaginationPipe,
  SearchValidationPipe,
} from './business.pipe';
import { AccessLevel } from '../enums/access-level.enum';

describe('AccessLevelValidationPipe', () => {
  let pipe: AccessLevelValidationPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    mockMetadata = {
      type: 'query',
      metatype: String,
      data: 'accessLevel',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      pipe = new AccessLevelValidationPipe();
    });

    it('should parse and return valid access levels', () => {
      expect(pipe.transform('STANDARD', mockMetadata)).toBe(AccessLevel.STANDARD);
      expect(pipe.transform('PREMIUM', mockMetadata)).toBe(AccessLevel.PREMIUM);
      expect(pipe.transform('ADMIN', mockMetadata)).toBe(AccessLevel.ADMIN);
    });

    it('should handle case-insensitive input', () => {
      expect(pipe.transform('standard', mockMetadata)).toBe(AccessLevel.STANDARD);
      expect(pipe.transform('Premium', mockMetadata)).toBe(AccessLevel.PREMIUM);
      expect(pipe.transform('admin', mockMetadata)).toBe(AccessLevel.ADMIN);
    });

    it('should handle alternative names', () => {
      expect(pipe.transform('BASIC', mockMetadata)).toBe(AccessLevel.STANDARD);
      expect(pipe.transform('ADMINISTRATOR', mockMetadata)).toBe(AccessLevel.ADMIN);
    });

    it('should throw BadRequestException for invalid access levels', () => {
      expect(() => pipe.transform('INVALID', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('SUPER_ADMIN', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('INVALID', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('Invalid access level');
        expect(error.message).toContain('STANDARD, PREMIUM, ADMIN');
      }
    });

    it('should throw BadRequestException for null/undefined values', () => {
      expect(() => pipe.transform(null, mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform(undefined, mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with allowed levels restriction', () => {
    beforeEach(() => {
      pipe = new AccessLevelValidationPipe({
        allowedLevels: [AccessLevel.PREMIUM, AccessLevel.ADMIN],
      });
    });

    it('should allow only specified levels', () => {
      expect(pipe.transform('PREMIUM', mockMetadata)).toBe(AccessLevel.PREMIUM);
      expect(pipe.transform('ADMIN', mockMetadata)).toBe(AccessLevel.ADMIN);
    });

    it('should reject non-allowed levels', () => {
      expect(() => pipe.transform('STANDARD', mockMetadata))
        .toThrow(ForbiddenException);

      try {
        pipe.transform('STANDARD', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('not allowed');
        expect(error.message).toContain('premium, admin');
      }
    });
  });

  describe('with minimum level requirement', () => {
    beforeEach(() => {
      pipe = new AccessLevelValidationPipe({
        minimumLevel: AccessLevel.PREMIUM,
      });
    });

    it('should allow levels meeting minimum requirement', () => {
      expect(pipe.transform('PREMIUM', mockMetadata)).toBe(AccessLevel.PREMIUM);
      expect(pipe.transform('ADMIN', mockMetadata)).toBe(AccessLevel.ADMIN);
    });

    it('should reject levels below minimum', () => {
      expect(() => pipe.transform('STANDARD', mockMetadata))
        .toThrow(ForbiddenException);

      try {
        pipe.transform('STANDARD', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('Insufficient access level');
        expect(error.message).toContain('Required: premium, Provided: standard');
      }
    });
  });

  describe('with custom error message', () => {
    beforeEach(() => {
      pipe = new AccessLevelValidationPipe({
        allowedLevels: [AccessLevel.ADMIN],
        errorMessage: 'Admin access required',
      });
    });

    it('should use custom error message', () => {
      try {
        pipe.transform('STANDARD', mockMetadata);
      } catch (error) {
        expect(error.message).toBe('Admin access required');
      }
    });
  });

  describe('access level hierarchy logic', () => {
    beforeEach(() => {
      pipe = new AccessLevelValidationPipe();
    });

    it('should correctly validate access level hierarchy', () => {
      const hasMinimumAccessLevel = (pipe as any).hasMinimumAccessLevel;

      // STANDARD (1) vs STANDARD (1)
      expect(hasMinimumAccessLevel(AccessLevel.STANDARD, AccessLevel.STANDARD)).toBe(true);
      
      // PREMIUM (2) vs STANDARD (1)
      expect(hasMinimumAccessLevel(AccessLevel.PREMIUM, AccessLevel.STANDARD)).toBe(true);
      
      // ADMIN (3) vs PREMIUM (2)
      expect(hasMinimumAccessLevel(AccessLevel.ADMIN, AccessLevel.PREMIUM)).toBe(true);
      
      // STANDARD (1) vs PREMIUM (2) - should fail
      expect(hasMinimumAccessLevel(AccessLevel.STANDARD, AccessLevel.PREMIUM)).toBe(false);
      
      // PREMIUM (2) vs ADMIN (3) - should fail
      expect(hasMinimumAccessLevel(AccessLevel.PREMIUM, AccessLevel.ADMIN)).toBe(false);
    });
  });
});

describe('SecuritySanitizationPipe', () => {
  let pipe: SecuritySanitizationPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    mockMetadata = {
      type: 'query',
      metatype: String,
      data: 'content',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      pipe = new SecuritySanitizationPipe();
    });

    it('should return null and undefined values as-is', () => {
      expect(pipe.transform(null, mockMetadata)).toBeNull();
      expect(pipe.transform(undefined, mockMetadata)).toBeUndefined();
    });

    it('should sanitize and trim string inputs', () => {
      expect(pipe.transform('  hello world  ', mockMetadata)).toBe('hello world');
      expect(pipe.transform('normal text', mockMetadata)).toBe('normal text');
    });

    it('should handle nested objects recursively', () => {
      const input = {
        title: '  My Title  ',
        content: 'Some content',
        nested: {
          field: '  nested value  ',
        },
      };

      const result = pipe.transform(input, mockMetadata);

      expect(result.title).toBe('My Title');
      expect(result.content).toBe('Some content');
      expect(result.nested.field).toBe('nested value');
    });

    it('should handle arrays recursively', () => {
      const input = ['  item1  ', '  item2  ', { nested: '  value  ' }];
      const result = pipe.transform(input, mockMetadata);

      expect(result).toEqual(['item1', 'item2', { nested: 'value' }]);
    });
  });

  describe('length validation', () => {
    beforeEach(() => {
      pipe = new SecuritySanitizationPipe({ maxLength: 10 });
    });

    it('should allow strings within length limit', () => {
      expect(pipe.transform('short', mockMetadata)).toBe('short');
    });

    it('should throw BadRequestException for strings exceeding length', () => {
      expect(() => pipe.transform('this is too long', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('this is too long', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('exceeds maximum length');
      }
    });
  });

  describe('SQL injection prevention', () => {
    beforeEach(() => {
      pipe = new SecuritySanitizationPipe({ preventSqlInjection: true });
    });

    it('should detect and block SQL injection patterns', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        'SELECT * FROM users WHERE id = 1',
        'INSERT INTO table VALUES',
        'UPDATE users SET password',
        'DELETE FROM users',
        "' OR '1'='1",
        'UNION SELECT password FROM users',
      ];

      sqlInjectionAttempts.forEach(attempt => {
        expect(() => pipe.transform(attempt, mockMetadata))
          .toThrow(BadRequestException);
      });
    });

    it('should allow safe content', () => {
      const safeContent = [
        'This is normal text',
        'Email: user@example.com',
        'Phone: 123-456-7890',
        'Search for products',
      ];

      safeContent.forEach(content => {
        expect(() => pipe.transform(content, mockMetadata)).not.toThrow();
      });
    });
  });

  describe('XSS prevention', () => {
    beforeEach(() => {
      pipe = new SecuritySanitizationPipe({ preventXss: true });
    });

    it('should detect and block XSS patterns', () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<iframe src="malicious.com"></iframe>',
        'javascript:alert(1)',
        '<img src="x" onerror="alert(1)">',
        '<div onclick="alert(1)">Click me</div>',
      ];

      xssAttempts.forEach(attempt => {
        expect(() => pipe.transform(attempt, mockMetadata))
          .toThrow(BadRequestException);
      });
    });

    it('should allow safe HTML when configured', () => {
      pipe = new SecuritySanitizationPipe({ 
        preventXss: true, 
        allowHtml: true 
      });

      const result = pipe.transform('<p>Safe paragraph</p>', mockMetadata);
      expect(result).toBe('<p>Safe paragraph</p>');
    });

    it('should escape dangerous HTML when HTML is allowed', () => {
      pipe = new SecuritySanitizationPipe({ 
        preventXss: true, 
        allowHtml: true 
      });

      // When allowHtml is true, the pipe should not throw, but return the escaped input
      const result = pipe.transform('<script>alert(1)</script>', mockMetadata);
      expect(result).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  describe('script injection prevention', () => {
    beforeEach(() => {
      pipe = new SecuritySanitizationPipe({ preventScriptInjection: true });
    });

    it('should detect and block script injection patterns', () => {
      const scriptInjectionAttempts = [
        'eval("alert(1)")',
        'setTimeout("alert(1)", 100)',
        'setInterval("alert(1)", 100)',
        'new Function("alert(1)")()',
        'document.write("<script>alert(1)</script>")',
      ];

      scriptInjectionAttempts.forEach(attempt => {
        expect(() => pipe.transform(attempt, mockMetadata))
          .toThrow(BadRequestException);
      });
    });
  });

  describe('custom blacklist', () => {
    beforeEach(() => {
      pipe = new SecuritySanitizationPipe({
        customBlacklist: ['spam', 'advertisement', 'viagra'],
      });
    });

    it('should block blacklisted content', () => {
      expect(() => pipe.transform('This is spam content', mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform('Buy viagra now!', mockMetadata))
        .toThrow(BadRequestException);
    });

    it('should be case insensitive for blacklist', () => {
      expect(() => pipe.transform('SPAM message', mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('dangerous property names', () => {
    beforeEach(() => {
      pipe = new SecuritySanitizationPipe();
    });

    it('should block dangerous property names in objects', () => {
      const dangerousObjects = [
        { '__proto__': 'malicious', constructor: undefined, prototype: undefined },
        { 'constructor': 'hack' },
        { 'prototype': 'exploit', constructor: undefined },
      ];

      dangerousObjects.forEach(obj => {
        expect(() => pipe.transform(obj, mockMetadata))
          .toThrow(BadRequestException);
      });
    });
  });
});

describe('PaginationPipe', () => {
  let pipe: PaginationPipe;
  let mockMetadata: ArgumentMetadata;

  beforeEach(() => {
    mockMetadata = {
      type: 'query',
      metatype: Object,
      data: 'pagination',
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      pipe = new PaginationPipe();
    });

    it('should return default pagination when no input provided', () => {
      const result = pipe.transform({}, mockMetadata);
      
      expect(result).toEqual({
        page: 1,
        limit: 10,
        offset: 0,
      });
    });

    it('should process valid pagination parameters', () => {
      const input = { page: 3, limit: 20 };
      const result = pipe.transform(input, mockMetadata);

      expect(result).toEqual({
        page: 3,
        limit: 20,
        offset: 40, // (3-1) * 20
      });
    });

    it('should handle single parameter inputs based on metadata', () => {
      const pageMetadata = { ...mockMetadata, data: 'page' };
      const limitMetadata = { ...mockMetadata, data: 'limit' };

      const pageResult = pipe.transform(5, pageMetadata);
      expect(pageResult.page).toBe(5);
      expect(pageResult.limit).toBe(10); // default

      const limitResult = pipe.transform(25, limitMetadata);
      expect(limitResult.page).toBe(1); // default
      expect(limitResult.limit).toBe(25);
    });
  });

  describe('with custom defaults', () => {
    beforeEach(() => {
      pipe = new PaginationPipe({
        defaultPage: 2,
        defaultLimit: 25,
        maxLimit: 50,
        minLimit: 5,
      });
    });

    it('should use custom default values', () => {
      const result = pipe.transform({}, mockMetadata);

      expect(result).toEqual({
        page: 2,
        limit: 25,
        offset: 25, // (2-1) * 25
      });
    });

    it('should enforce minimum and maximum limits', () => {
      const validResult = pipe.transform({ limit: 30 }, mockMetadata);
      expect(validResult.limit).toBe(30);

      expect(() => pipe.transform({ limit: 3 }, mockMetadata))
        .toThrow(BadRequestException);

      expect(() => pipe.transform({ limit: 100 }, mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('page validation', () => {
    beforeEach(() => {
      pipe = new PaginationPipe();
    });

    it('should validate page numbers', () => {
      expect(() => pipe.transform({ page: 0 }, mockMetadata))
        .toThrow(BadRequestException);

      expect(() => pipe.transform({ page: -1 }, mockMetadata))
        .toThrow(BadRequestException);

      expect(() => pipe.transform({ page: 'invalid' }, mockMetadata))
        .toThrow(BadRequestException);
    });

    it('should enforce reasonable upper limit for page numbers', () => {
      expect(() => pipe.transform({ page: 1000001 }, mockMetadata))
        .toThrow(BadRequestException);
    });

    it('should handle string page numbers', () => {
      const result = pipe.transform({ page: '5' }, mockMetadata);
      expect(result.page).toBe(5);
    });
  });

  describe('limit validation', () => {
    beforeEach(() => {
      pipe = new PaginationPipe({ minLimit: 1, maxLimit: 100 });
    });

    it('should validate limit values', () => {
      expect(() => pipe.transform({ limit: 0 }, mockMetadata))
        .toThrow(BadRequestException);

      expect(() => pipe.transform({ limit: 101 }, mockMetadata))
        .toThrow(BadRequestException);

      expect(() => pipe.transform({ limit: 'invalid' }, mockMetadata))
        .toThrow(BadRequestException);
    });

    it('should handle string limit values', () => {
      const result = pipe.transform({ limit: '20' }, mockMetadata);
      expect(result.limit).toBe(20);
    });
  });

  describe('offset calculation', () => {
    beforeEach(() => {
      pipe = new PaginationPipe();
    });

    it('should calculate offset correctly', () => {
      const testCases = [
        { page: 1, limit: 10, expectedOffset: 0 },
        { page: 2, limit: 10, expectedOffset: 10 },
        { page: 3, limit: 20, expectedOffset: 40 },
        { page: 5, limit: 15, expectedOffset: 60 },
      ];

      testCases.forEach(({ page, limit, expectedOffset }) => {
        const result = pipe.transform({ page, limit }, mockMetadata);
        expect(result.offset).toBe(expectedOffset);
      });
    });
  });
});

describe('SearchValidationPipe', () => {
  let pipe: SearchValidationPipe;
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
      pipe = new SearchValidationPipe();
    });

    it('should return null for empty search terms', () => {
      expect(pipe.transform('', mockMetadata)).toBeNull();
      expect(pipe.transform('   ', mockMetadata)).toBeNull();
      expect(pipe.transform(null, mockMetadata)).toBeNull();
      expect(pipe.transform(undefined, mockMetadata)).toBeNull();
    });

    it('should validate and return trimmed search terms', () => {
      expect(pipe.transform('  search term  ', mockMetadata)).toBe('search term');
      expect(pipe.transform('valid search', mockMetadata)).toBe('valid search');
    });

    it('should throw BadRequestException for invalid input types', () => {
      expect(() => pipe.transform(123, mockMetadata))
        .toThrow(BadRequestException);
      expect(() => pipe.transform(['array'], mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('with length validation', () => {
    beforeEach(() => {
      pipe = new SearchValidationPipe({ minLength: 3, maxLength: 50 });
    });

    it('should validate search term length', () => {
      expect(pipe.transform('valid', mockMetadata)).toBe('valid');
      expect(pipe.transform('a'.repeat(50), mockMetadata)).toBe('a'.repeat(50));
    });

    it('should throw BadRequestException for terms too short', () => {
      expect(() => pipe.transform('ab', mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('ab', mockMetadata);
      } catch (error) {
        expect(error.message).toContain('at least 3 characters');
      }
    });

    it('should throw BadRequestException for terms too long', () => {
      expect(() => pipe.transform('a'.repeat(51), mockMetadata))
        .toThrow(BadRequestException);

      try {
        pipe.transform('a'.repeat(51), mockMetadata);
      } catch (error) {
        expect(error.message).toContain('cannot exceed 50 characters');
      }
    });
  });

  describe('with security validation', () => {
    beforeEach(() => {
      pipe = new SearchValidationPipe({ preventInjection: true });
    });

    it('should detect and block dangerous patterns', () => {
      const dangerousPatterns = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        'SELECT * FROM users',
        "'; DROP TABLE users; --",
        '<img onerror="alert(1)">',
      ];

      dangerousPatterns.forEach(pattern => {
        expect(() => pipe.transform(pattern, mockMetadata))
          .toThrow(BadRequestException);
      });
    });

    it('should allow safe search terms', () => {
      const safeTerms = [
        'normal search',
        'product name',
        'user@example.com',
        'category: electronics',
      ];

      safeTerms.forEach(term => {
        expect(() => pipe.transform(term, mockMetadata)).not.toThrow();
      });
    });
  });

  describe('with search object validation', () => {
    beforeEach(() => {
      pipe = new SearchValidationPipe({
        allowedFields: ['name', 'email', 'category'],
        allowedOperators: ['contains', 'equals', 'startsWith'],
      });
    });

    it('should validate search objects with allowed fields', () => {
      const searchObj = {
        name: 'john',
        email: 'user@example.com',
        category: 'electronics',
      };

      const result = pipe.transform(searchObj, mockMetadata);
      expect(result).toEqual(searchObj);
    });

    it('should reject search objects with disallowed fields', () => {
      const invalidSearchObj = {
        name: 'john',
        password: 'secret', // Not in allowedFields
      };

      expect(() => pipe.transform(invalidSearchObj, mockMetadata))
        .toThrow(BadRequestException);
    });

    it('should validate advanced search with operators', () => {
      const advancedSearch = {
        name: {
          operator: 'contains',
          value: 'john',
        },
      };

      const result = pipe.transform(advancedSearch, mockMetadata);
      expect(result.name.operator).toBe('contains');
      expect(result.name.value).toBe('john');
    });

    it('should reject invalid operators', () => {
      const invalidOperatorSearch = {
        name: {
          operator: 'invalidOp',
          value: 'john',
        },
      };

      expect(() => pipe.transform(invalidOperatorSearch, mockMetadata))
        .toThrow(BadRequestException);
    });

    it('should detect dangerous field names', () => {
      const dangerousSearch = {
        __proto__: 'malicious',
      };

      expect(() => pipe.transform(dangerousSearch, mockMetadata))
        .toThrow(BadRequestException);
    });
  });

  describe('security patterns detection', () => {
    beforeEach(() => {
      pipe = new SearchValidationPipe();
    });

    it('should detect dangerous patterns in search terms', () => {
      const containsDangerousPatterns = (pipe as any).containsDangerousPatterns;

      expect(containsDangerousPatterns('<script>')).toBe(true);
      expect(containsDangerousPatterns('javascript:')).toBe(true);
      expect(containsDangerousPatterns('SELECT FROM')).toBe(true);
      expect(containsDangerousPatterns('onclick=')).toBe(true);
      expect(containsDangerousPatterns("'; DROP")).toBe(true);

      expect(containsDangerousPatterns('normal search')).toBe(false);
      expect(containsDangerousPatterns('safe content')).toBe(false);
    });

    it('should detect dangerous field names', () => {
      const containsDangerousFieldName = (pipe as any).containsDangerousFieldName;

      expect(containsDangerousFieldName('__proto__')).toBe(true);
      expect(containsDangerousFieldName('constructor')).toBe(true);
      expect(containsDangerousFieldName('password')).toBe(true);
      expect(containsDangerousFieldName('token')).toBe(true);
      expect(containsDangerousFieldName('secret')).toBe(true);

      expect(containsDangerousFieldName('name')).toBe(false);
      expect(containsDangerousFieldName('email')).toBe(false);
    });
  });
});