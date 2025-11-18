import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';

/**
 * Pipe to parse and validate string parameters as integers
 */
@Injectable()
export class ParseIntPipe implements PipeTransform<string, number | undefined> {
  private readonly logger = new Logger(ParseIntPipe.name);

  constructor(
    private readonly options: {
      optional?: boolean;
      min?: number;
      max?: number;
      errorMessage?: string;
    } = {}
  ) {}

  transform(value: string, metadata: ArgumentMetadata): number | undefined {
    if (this.options.optional && (value === undefined || value === null || value === '')) {
      return undefined;
    }

    const val = parseInt(value, 10);

    if (isNaN(val)) {
      const message = this.options.errorMessage || 
        `Validation failed. "${value}" is not a valid integer for parameter "${metadata.data}"`;
      
      this.logger.warn(`ParseInt validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    // Range validation
    if (this.options.min !== undefined && val < this.options.min) {
      const message = `Value ${val} is below minimum ${this.options.min} for parameter "${metadata.data}"`;
      this.logger.warn(`ParseInt range validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    if (this.options.max !== undefined && val > this.options.max) {
      const message = `Value ${val} exceeds maximum ${this.options.max} for parameter "${metadata.data}"`;
      this.logger.warn(`ParseInt range validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    return val;
  }
}

/**
 * Pipe to parse and validate UUID parameters
 */
@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string | undefined> {
  private readonly logger = new Logger(ParseUUIDPipe.name);
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly options: {
      optional?: boolean;
      version?: '3' | '4' | '5';
      errorMessage?: string;
    } = {}
  ) {}

  transform(value: string, metadata: ArgumentMetadata): string | undefined {
    if (this.options.optional && (value === undefined || value === null || value === '')) {
      return undefined;
    }

    if (!this.isValidUUID(value)) {
      const message = this.options.errorMessage || 
        `Validation failed. "${value}" is not a valid UUID for parameter "${metadata.data}"`;
      
      this.logger.warn(`UUID validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    return value;
  }

  private isValidUUID(value: string): boolean {
    if (!this.uuidRegex.test(value)) {
      return false;
    }

    // Version-specific validation
    if (this.options.version) {
      const versionChar = value.charAt(14);
      return versionChar === this.options.version;
    }

    return true;
  }
}

/**
 * Pipe to trim and sanitize string inputs
 */
@Injectable()
export class TrimPipe implements PipeTransform<string, string | null | undefined> {
  private readonly logger = new Logger(TrimPipe.name);

  constructor(
    private readonly options: {
      transformEmpty?: 'null' | 'undefined' | 'keep';
      maxLength?: number;
      minLength?: number;
      toLowerCase?: boolean;
      toUpperCase?: boolean;
    } = {}
  ) {}

  transform(value: string, metadata: ArgumentMetadata): string | null | undefined {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(
        `Validation failed. Expected string for parameter "${metadata.data}", got ${typeof value}`
      );
    }

    let transformed = value.trim();

    // Handle empty strings
    if (transformed === '') {
      switch (this.options.transformEmpty) {
        case 'null':
          return null;
        case 'undefined':
          return undefined;
        case 'keep':
        default:
          break;
      }
    }

    // Case transformation
    if (this.options.toLowerCase) {
      transformed = transformed.toLowerCase();
    } else if (this.options.toUpperCase) {
      transformed = transformed.toUpperCase();
    }

    // Length validation
    if (this.options.minLength !== undefined && transformed.length < this.options.minLength) {
      const message = `String length ${transformed.length} is below minimum ${this.options.minLength} for parameter "${metadata.data}"`;
      this.logger.warn(`Trim validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    if (this.options.maxLength !== undefined && transformed.length > this.options.maxLength) {
      const message = `String length ${transformed.length} exceeds maximum ${this.options.maxLength} for parameter "${metadata.data}"`;
      this.logger.warn(`Trim validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    return transformed;
  }
}

/**
 * Pipe to parse and validate boolean parameters
 */
@Injectable()
export class ParseBoolPipe implements PipeTransform<string, boolean | undefined> {
  private readonly logger = new Logger(ParseBoolPipe.name);

  constructor(
    private readonly options: {
      optional?: boolean;
      errorMessage?: string;
    } = {}
  ) {}

  transform(value: string, metadata: ArgumentMetadata): boolean | undefined {
    if (this.options.optional && (value === undefined || value === null || value === '')) {
      return undefined;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      
      if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
        return true;
      }
      
      if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
        return false;
      }
    }

    const message = this.options.errorMessage || 
      `Validation failed. "${value}" is not a valid boolean for parameter "${metadata.data}"`;
    
    this.logger.warn(`ParseBool validation failed: ${message}`);
    throw new BadRequestException(message);
  }
}

/**
 * Pipe to parse and validate array parameters from comma-separated strings
 */
@Injectable()
export class ParseArrayPipe implements PipeTransform<string, any[] | undefined> {
  private readonly logger = new Logger(ParseArrayPipe.name);

  constructor(
    private readonly options: {
      separator?: string;
      itemType?: 'string' | 'number' | 'boolean';
      unique?: boolean;
      maxItems?: number;
      minItems?: number;
      optional?: boolean;
    } = {}
  ) {}

  transform(value: string, metadata: ArgumentMetadata): any[] | undefined {
    if (this.options.optional && (value === undefined || value === null || value === '')) {
      return undefined;
    }

    if (Array.isArray(value)) {
      return this.validateAndTransformArray(value, metadata);
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(
        `Validation failed. Expected string or array for parameter "${metadata.data}", got ${typeof value}`
      );
    }

    const separator = this.options.separator || ',';
    const items = value.split(separator).map(item => item.trim());

    return this.validateAndTransformArray(items, metadata);
  }

  private validateAndTransformArray(items: any[], metadata: ArgumentMetadata): any[] {
    // Length validation
    if (this.options.minItems !== undefined && items.length < this.options.minItems) {
      const message = `Array length ${items.length} is below minimum ${this.options.minItems} for parameter "${metadata.data}"`;
      this.logger.warn(`ParseArray validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    if (this.options.maxItems !== undefined && items.length > this.options.maxItems) {
      const message = `Array length ${items.length} exceeds maximum ${this.options.maxItems} for parameter "${metadata.data}"`;
      this.logger.warn(`ParseArray validation failed: ${message}`);
      throw new BadRequestException(message);
    }

    // Type transformation
    let transformedItems = items;
    
    if (this.options.itemType) {
      transformedItems = items.map((item, index) => {
        try {
          return this.transformItem(item, this.options.itemType!);
        } catch (error) {
          throw new BadRequestException(
            `Invalid ${this.options.itemType} at index ${index} in parameter "${metadata.data}": ${item}`
          );
        }
      });
    }

    // Unique validation
    if (this.options.unique) {
      const uniqueItems = [...new Set(transformedItems)];
      if (uniqueItems.length !== transformedItems.length) {
        throw new BadRequestException(
          `Duplicate values found in parameter "${metadata.data}". Array must contain unique values.`
        );
      }
    }

    return transformedItems;
  }

  private transformItem(item: any, type: 'string' | 'number' | 'boolean'): any {
    switch (type) {
      case 'number':
        const num = Number(item);
        if (isNaN(num)) {
          throw new Error(`Cannot convert "${item}" to number`);
        }
        return num;
      case 'boolean':
        if (typeof item === 'boolean') return item;
        const lower = String(item).toLowerCase();
        if (['true', '1', 'yes'].includes(lower)) return true;
        if (['false', '0', 'no'].includes(lower)) return false;
        throw new Error(`Cannot convert "${item}" to boolean`);
      case 'string':
      default:
        return String(item);
    }
  }
}