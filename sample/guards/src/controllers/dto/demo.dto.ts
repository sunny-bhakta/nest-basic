import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber, IsOptional, Min } from 'class-validator';

export class UserDataDto {
  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User age',
    example: 25,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  age?: number;
}

export class BatchProcessDto {
  @ApiProperty({
    description: 'Array of items to process',
    example: ['item1', 'item2', 'item3'],
    type: [String],
  })
  items: string[];
}

export class CacheKeyDto {
  @ApiProperty({
    description: 'Cache key to clear',
    example: 'user:123',
  })
  @IsString()
  key: string;
}

export class ProcessingResultDto {
  @ApiProperty({
    description: 'Processing success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of items processed',
    example: 3,
  })
  processed: number;

  @ApiProperty({
    description: 'Processing results array',
    example: ['result1', 'result2', 'result3'],
    type: [String],
  })
  results: string[];

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 150,
  })
  processingTime: number;
}

export class ValidationResultDto {
  @ApiProperty({
    description: 'Validation success message',
    example: 'Validation successful!',
  })
  message: string;

  @ApiProperty({
    description: 'Validated data object',
    example: { name: 'John Doe', email: 'john@example.com', age: 25 },
  })
  data: any;
}

export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Validation failed: Name is required, Email is required',
  })
  message: string;

  @ApiProperty({
    description: 'Error code',
    example: 'VALIDATION_ERROR',
  })
  error: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  statusCode: number;
}

export class HealthStatusDto {
  @ApiProperty({
    description: 'Application health status',
    example: 'OK',
  })
  status: string;

  @ApiProperty({
    description: 'Current timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Application uptime in milliseconds',
    example: 123456,
  })
  uptime: number;

  @ApiProperty({
    description: 'Active events count',
    example: 5,
  })
  eventsCount: number;
}