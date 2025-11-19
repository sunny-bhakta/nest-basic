import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Custom validation pipe that provides enhanced validation with detailed error messages
 * Integrates with the ValidationExceptionFilter for consistent error handling
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(ValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata): Promise<any> {
    // Skip validation for primitive types and missing metatype
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Skip if value is null or undefined
    if (value === null || value === undefined) {
      throw new BadRequestException('Validation failed: Request body is required');
    }

    // Transform plain object to class instance
    const object = plainToClass(metatype, value);

    // Perform validation
    const errors = await validate(object, {
      whitelist: true,           // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true,           // Transform values to expected types
      validateCustomDecorators: true, // Validate custom decorators
    });

    if (errors.length > 0) {
      // Format validation errors for the ValidationExceptionFilter
      const formattedErrors = this.formatValidationErrors(errors);
      
      this.logger.warn(`Validation failed for ${metatype.name}: ${errors.length} errors found`);
      
      // Throw BadRequestException that will be caught by ValidationExceptionFilter
      throw new BadRequestException({
        statusCode: 400,
        message: formattedErrors,
        error: 'Bad Request',
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatValidationErrors(errors: any[]): string[] {
    const formattedErrors: string[] = [];

    errors.forEach((error) => {
      if (error.constraints) {
        Object.values(error.constraints).forEach((message) => {
          formattedErrors.push(message as string);
        });
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatValidationErrors(error.children);
        formattedErrors.push(...nestedErrors.map(msg => `${error.property}.${msg}`));
      }
    });

    return formattedErrors;
  }
}

/**
 * Strict validation pipe that removes unknown properties and validates strictly
 */
@Injectable()
export class StrictValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(StrictValidationPipe.name);

  async transform(value: any, { metatype }: ArgumentMetadata): Promise<any> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    if (value === null || value === undefined) {
      throw new BadRequestException('Request body is required');
    }

    // Transform and validate with strict options
    const object = plainToClass(metatype, value, {
      excludeExtraneousValues: true, // Only include @Expose() decorated properties
    });

    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      skipMissingProperties: false,   // Don't skip missing required properties
      validateCustomDecorators: true,
    });

    console.log('Validation Errors:', errors);

    if (errors.length > 0) {
      const errorMessages = errors.map(error => 
        Object.values(error.constraints || {}).join(', ')
      ).join('; ');

      this.logger.warn(`Strict validation failed: ${errorMessages}`);
      
      throw new BadRequestException({
        statusCode: 400,
        message: this.formatDetailedErrors(errors),
        error: 'Validation Error',
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatDetailedErrors(errors: any[]): string[] {
    return errors.flatMap(error => {
      const messages: string[] = [];
      
      if (error.constraints) {
        Object.entries(error.constraints).forEach(([key, message]) => {
          messages.push(`${error.property}: ${message}`);
        });
      }

      if (error.children?.length > 0) {
        const childErrors = this.formatDetailedErrors(error.children);
        messages.push(...childErrors.map(msg => `${error.property}.${msg}`));
      }

      return messages;
    });
  }
}