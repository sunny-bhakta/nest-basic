// src/validation/validation.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {

    console.log('1-ValidationPipe - Transforming value:', JSON.stringify(value), 'for metadata:', metatype?.name); 
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    
    // Transform plain object to class instance
    const object = plainToClass(metatype, value);
    
    // Validate using class-validator decorators
    const errors = await validate(object);
    
    if (errors.length > 0) {
      throw new BadRequestException('Validation failed');
    }
    
    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}