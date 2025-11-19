import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { AccessLevel } from '../enums/access-level.enum';

/**
 * Pipe to validate and enforce access level requirements
 * Integrates with the existing guard system and custom exception filters
 */
@Injectable()
export class AccessLevelValidationPipe implements PipeTransform<string, AccessLevel> {
  private readonly logger = new Logger(AccessLevelValidationPipe.name);

  constructor(
    private readonly options: {
      allowedLevels?: AccessLevel[];
      minimumLevel?: AccessLevel;
      errorMessage?: string;
    } = {}
  ) {}

  transform(value: string, metadata: ArgumentMetadata): AccessLevel {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(
        `Access level is required for parameter "${metadata.data}"`
      );
    }

    // Convert string to AccessLevel enum
    const accessLevel = this.parseAccessLevel(value);

    // Validate against allowed levels
    if (this.options.allowedLevels && !this.options.allowedLevels.includes(accessLevel)) {
      const message = this.options.errorMessage || 
        `Access level "${value}" is not allowed. Allowed levels: ${this.options.allowedLevels.join(', ')}`;
      
      this.logger.warn(`Access level validation failed: ${message}`);
      throw new ForbiddenException(message);
    }

    // Validate minimum level requirement
    if (this.options.minimumLevel && !this.hasMinimumAccessLevel(accessLevel, this.options.minimumLevel)) {
      const message = this.options.errorMessage || 
        `Insufficient access level. Required: ${this.options.minimumLevel}, Provided: ${accessLevel}`;
      
      this.logger.warn(`Minimum access level validation failed: ${message}`);
      throw new ForbiddenException(message);
    }

    return accessLevel;
  }

  private parseAccessLevel(value: string): AccessLevel {
    const normalizedValue = value.toUpperCase();
    
    switch (normalizedValue) {
      case 'STANDARD':
      case 'BASIC':
        return AccessLevel.STANDARD;
      case 'PREMIUM':
        return AccessLevel.PREMIUM;
      case 'ADMIN':
      case 'ADMINISTRATOR':
        return AccessLevel.ADMIN;
      default:
        throw new BadRequestException(
          `Invalid access level: "${value}". Valid levels are: STANDARD, PREMIUM, ADMIN`
        );
    }
  }

  private hasMinimumAccessLevel(current: AccessLevel, required: AccessLevel): boolean {
    const levelHierarchy = {
      [AccessLevel.STANDARD]: 1,
      [AccessLevel.PREMIUM]: 2,
      [AccessLevel.ADMIN]: 3,
    };

    return levelHierarchy[current] >= levelHierarchy[required];
  }
}

/**
 * Pipe to sanitize and validate user input for security
 */
@Injectable()
export class SecuritySanitizationPipe implements PipeTransform<any, any> {
  private readonly logger = new Logger(SecuritySanitizationPipe.name);

  constructor(
    private readonly options: {
      allowHtml?: boolean;
      maxLength?: number;
      preventSqlInjection?: boolean;
      preventXss?: boolean;
      preventScriptInjection?: boolean;
      customBlacklist?: string[];
    } = {}
  ) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value, metadata);
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.sanitizeObject(value, metadata);
    }

    if (Array.isArray(value)) {
      return value.map((item, index) => 
        this.transform(item, { ...metadata, data: `${metadata.data}[${index}]` })
      );
    }

    return value;
  }

  private sanitizeString(value: string, metadata: ArgumentMetadata): string {
    let sanitized = value;

    // Length validation
    if (this.options.maxLength && sanitized.length > this.options.maxLength) {
      const message = `Input exceeds maximum length of ${this.options.maxLength} characters for parameter "${metadata.data}"`;
      this.logger.warn(`Security validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    // SQL injection prevention
    if (this.options.preventSqlInjection !== false && this.containsSqlInjection(sanitized)) {
      const message = `Potential SQL injection detected in parameter "${metadata.data}"`;
      this.logger.error(`SECURITY ALERT: ${message} - Value: ${sanitized}`);
      throw new BadRequestException('Invalid input: potential security risk detected');
    }

    // XSS prevention
    if (this.options.preventXss !== false && this.containsXss(sanitized)) {
      const message = `Potential XSS attack detected in parameter "${metadata.data}"`;
      this.logger.error(`SECURITY ALERT: ${message} - Value: ${sanitized}`);
      
      if (!this.options.allowHtml) {
        throw new BadRequestException('Invalid input: HTML/script content not allowed');
      } else {
        // Escape dangerous HTML if HTML is allowed
        sanitized = this.escapeHtml(sanitized);
      }
    }

    // Script injection prevention
    if (this.options.preventScriptInjection !== false && this.containsScriptInjection(sanitized)) {
      const message = `Potential script injection detected in parameter "${metadata.data}"`;
      this.logger.error(`SECURITY ALERT: ${message} - Value: ${sanitized}`);
      throw new BadRequestException('Invalid input: script injection not allowed');
    }

    // Custom blacklist validation
    if (this.options.customBlacklist && this.containsBlacklistedContent(sanitized)) {
      const message = `Blacklisted content detected in parameter "${metadata.data}"`;
      this.logger.warn(`Security validation failed: ${message}`);
      throw new BadRequestException('Invalid input: contains prohibited content');
    }

    return sanitized.trim();
  }

  private sanitizeObject(obj: any, metadata: ArgumentMetadata): any {
    const sanitized: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Validate property names
      if (this.containsDangerousPropertyName(key)) {
        const message = `Dangerous property name detected: "${key}" in parameter "${metadata.data}"`;
        this.logger.error(`SECURITY ALERT: ${message}`);
        throw new BadRequestException('Invalid input: dangerous property name');
      }

      sanitized[key] = this.transform(value, { ...metadata, data: `${metadata.data}.${key}` });
    }

    return sanitized;
  }

  private containsSqlInjection(value: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /('|(\\')|(;)|(--)|(\/\*)|(\*\/)|(\|)|(%7C))/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  private containsXss(value: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[\\s]*=[\\s]*["\']([^"\'><]+)["\'][^>]*>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(value));
  }

  private containsScriptInjection(value: string): boolean {
    const scriptPatterns = [
      /eval\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi,
      /Function\s*\(/gi,
      /new\s+Function/gi,
      /document\.write/gi,
    ];

    return scriptPatterns.some(pattern => pattern.test(value));
  }

  private containsBlacklistedContent(value: string): boolean {
    if (!this.options.customBlacklist) return false;

    return this.options.customBlacklist.some(blacklisted => 
      value.toLowerCase().includes(blacklisted.toLowerCase())
    );
  }

  private containsDangerousPropertyName(key: string): boolean {
    const dangerousNames = [
      '__proto__',
      'constructor',
      'prototype',
      'toString',
      'valueOf',
      'hasOwnProperty',
    ];

    return dangerousNames.includes(key.toLowerCase());
  }

  private escapeHtml(value: string): string {
    const htmlEscapes: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return value.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
  }
}

/**
 * Pipe to validate and format pagination parameters
 */
@Injectable()
export class PaginationPipe implements PipeTransform<any, any> {
  private readonly logger = new Logger(PaginationPipe.name);

  constructor(
    private readonly options: {
      defaultPage?: number;
      defaultLimit?: number;
      maxLimit?: number;
      minLimit?: number;
    } = {}
  ) {}

  transform(value: any, metadata: ArgumentMetadata): { page: number; limit: number; offset: number } {
    const defaultPage = this.options.defaultPage || 1;
    const defaultLimit = this.options.defaultLimit || 10;
    const maxLimit = this.options.maxLimit || 100;
    const minLimit = this.options.minLimit || 1;

    let page = defaultPage;
    let limit = defaultLimit;

    // Handle query object with page and limit
    if (value && typeof value === 'object') {
      page = this.validatePage(value.page, defaultPage);
      limit = this.validateLimit(value.limit, defaultLimit, minLimit, maxLimit);
    }
    // Handle single parameter (page or limit based on parameter name)
    else if (value !== undefined && value !== null) {
      if (metadata.data === 'page') {
        page = this.validatePage(value, defaultPage);
        limit = defaultLimit;
      } else if (metadata.data === 'limit' || metadata.data === 'size') {
        page = defaultPage;
        limit = this.validateLimit(value, defaultLimit, minLimit, maxLimit);
      }
    }

    const offset = (page - 1) * limit;

    this.logger.log(`Pagination params validated: page=${page}, limit=${limit}, offset=${offset}`);

    return { page, limit, offset };
  }

  private validatePage(value: any, defaultPage: number): number {
    if (value === undefined || value === null || value === '') {
      return defaultPage;
    }

    const page = parseInt(String(value), 10);

    if (isNaN(page) || page < 1) {
      throw new BadRequestException('Page must be a positive integer starting from 1');
    }

    // Reasonable upper limit for page numbers
    if (page > 1000000) {
      throw new BadRequestException('Page number exceeds maximum allowed value');
    }

    return page;
  }

  private validateLimit(value: any, defaultLimit: number, minLimit: number, maxLimit: number): number {
    if (value === undefined || value === null || value === '') {
      return defaultLimit;
    }

    const limit = parseInt(String(value), 10);

    if (isNaN(limit) || limit < minLimit) {
      throw new BadRequestException(`Limit must be at least ${minLimit}`);
    }

    if (limit > maxLimit) {
      throw new BadRequestException(`Limit cannot exceed ${maxLimit}`);
    }

    return limit;
  }
}

/**
 * Pipe to validate and sanitize search parameters
 */
@Injectable()
export class SearchValidationPipe implements PipeTransform<any, any> {
  private readonly logger = new Logger(SearchValidationPipe.name);

  constructor(
    private readonly options: {
      minLength?: number;
      maxLength?: number;
      allowedFields?: string[];
      allowedOperators?: string[];
      preventInjection?: boolean;
    } = {}
  ) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    if (typeof value === 'string') {
      return this.validateSearchTerm(value, metadata);
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.validateSearchObject(value, metadata);
    }

    throw new BadRequestException(
      `Invalid search parameter format for "${metadata.data}". Expected string or object.`
    );
  }

  private validateSearchTerm(term: string, metadata: ArgumentMetadata): string {
    const trimmed = term.trim();

    // Length validation
    const minLength = this.options.minLength || 1;
    const maxLength = this.options.maxLength || 100;

    if (trimmed.length < minLength) {
      throw new BadRequestException(
        `Search term must be at least ${minLength} characters for parameter "${metadata.data}"`
      );
    }

    if (trimmed.length > maxLength) {
      throw new BadRequestException(
        `Search term cannot exceed ${maxLength} characters for parameter "${metadata.data}"`
      );
    }

    // Security validation
    if (this.options.preventInjection !== false) {
      if (this.containsDangerousPatterns(trimmed)) {
        this.logger.warn(`Potentially dangerous search term detected: ${trimmed}`);
        throw new BadRequestException('Invalid search term: contains dangerous patterns');
      }
    }

    return trimmed;
  }

  private validateSearchObject(searchObj: any, metadata: ArgumentMetadata): any {
    const validated: any = {};

    for (const [field, value] of Object.entries(searchObj)) {
      // Validate allowed fields
      if (this.options.allowedFields && !this.options.allowedFields.includes(field)) {
        throw new BadRequestException(
          `Search field "${field}" is not allowed. Allowed fields: ${this.options.allowedFields.join(', ')}`
        );
      }

      // Validate field name for security
      if (this.containsDangerousFieldName(field)) {
        this.logger.error(`SECURITY: Dangerous search field name: ${field}`);
        throw new BadRequestException('Invalid search field name');
      }

      validated[field] = this.validateSearchValue(value, field);
    }

    return validated;
  }

  private validateSearchValue(value: any, field: string): any {
    if (typeof value === 'string') {
      return this.validateSearchTerm(value, { data: field } as ArgumentMetadata);
    }

    if (typeof value === 'object' && value.operator && value.value) {
      // Handle advanced search with operators
      if (this.options.allowedOperators && !this.options.allowedOperators.includes(value.operator)) {
        throw new BadRequestException(
          `Search operator "${value.operator}" is not allowed for field "${field}"`
        );
      }

      return {
        operator: value.operator,
        value: this.validateSearchTerm(String(value.value), { data: field } as ArgumentMetadata),
      };
    }

    return value;
  }

  private containsDangerousPatterns(value: string): boolean {
    const dangerousPatterns = [
      /[<>]/g,                    // HTML/XML tags
      /javascript:/gi,            // JavaScript protocol
      /on\w+\s*=/gi,             // Event handlers
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/gi, // SQL keywords
      /['"`;\\]/g,               // SQL injection chars
    ];

    return dangerousPatterns.some(pattern => pattern.test(value));
  }

  private containsDangerousFieldName(field: string): boolean {
    const dangerousNames = [
      '__proto__',
      'constructor',
      'prototype',
      'password',
      'token',
      'secret',
    ];

    return dangerousNames.some(dangerous => 
      field.toLowerCase().includes(dangerous.toLowerCase())
    );
  }
}