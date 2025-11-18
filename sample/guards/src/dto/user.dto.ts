import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Transform, Type, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccessLevel } from '../enums/access-level.enum';

/**
 * DTO for creating a new user - demonstrates validation pipes integration
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters' })
  @Transform(({ value }) => value?.trim())
  @Expose()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  @Expose()
  email: string;

  @ApiProperty({
    description: 'User age',
    example: 25,
    minimum: 13,
    maximum: 120,
  })
  @IsNumber({}, { message: 'Age must be a number' })
  @Min(13, { message: 'User must be at least 13 years old' })
  @Max(120, { message: 'Age cannot exceed 120 years' })
  @Type(() => Number)
  @Expose()
  age: number;

  @ApiProperty({
    description: 'User access level',
    enum: AccessLevel,
    example: AccessLevel.STANDARD,
  })
  @IsEnum(AccessLevel, { message: 'Access level must be STANDARD, PREMIUM, or ADMIN' })
  @Expose()
  accessLevel: AccessLevel;

  @ApiPropertyOptional({
    description: 'User preferences and settings',
    example: ['email_notifications', 'sms_alerts'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value.map((v: string) => v?.trim()) : value)
  @Expose()
  preferences?: string[];

  @ApiPropertyOptional({
    description: 'Whether user profile is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  @Expose()
  isActive?: boolean = true;
}

/**
 * DTO for updating user information
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User full name',
    example: 'Jane Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Transform(({ value }) => value?.trim())
  @Expose()
  name?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'jane.doe@example.com',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  @Expose()
  email?: string;

  @ApiPropertyOptional({
    description: 'User age',
    example: 30,
    minimum: 13,
    maximum: 120,
  })
  @IsOptional()
  @IsNumber()
  @Min(13)
  @Max(120)
  @Type(() => Number)
  @Expose()
  age?: number;

  @ApiPropertyOptional({
    description: 'User access level',
    enum: AccessLevel,
    example: AccessLevel.PREMIUM,
  })
  @IsOptional()
  @IsEnum(AccessLevel)
  @Expose()
  accessLevel?: AccessLevel;
}

/**
 * DTO for search parameters - demonstrates business logic pipes
 */
export class SearchDto {
  @ApiPropertyOptional({
    description: 'Search term',
    example: 'john',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  @Expose()
  q?: string;

  @ApiPropertyOptional({
    description: 'Fields to search in',
    example: ['name', 'email'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim());
    }
    return value;
  })
  @Expose()
  fields?: string[];

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @Expose()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @Expose()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by access level',
    enum: AccessLevel,
    example: AccessLevel.STANDARD,
  })
  @IsOptional()
  @IsEnum(AccessLevel)
  @Expose()
  accessLevel?: AccessLevel;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return value;
  })
  @Expose()
  isActive?: boolean;
}

/**
 * DTO for bulk operations
 */
export class BulkActionDto {
  @ApiProperty({
    description: 'Array of user IDs',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one ID is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 items allowed in bulk operation' })
  @IsUUID('4', { each: true, message: 'Each ID must be a valid UUID' })
  @Expose()
  ids: string[];

  @ApiProperty({
    description: 'Action to perform',
    example: 'activate',
    enum: ['activate', 'deactivate', 'delete', 'upgrade', 'downgrade'],
  })
  @IsString()
  @IsEnum(['activate', 'deactivate', 'delete', 'upgrade', 'downgrade'], {
    message: 'Action must be one of: activate, deactivate, delete, upgrade, downgrade',
  })
  @Expose()
  action: 'activate' | 'deactivate' | 'delete' | 'upgrade' | 'downgrade';

  @ApiPropertyOptional({
    description: 'Additional parameters for the action',
    example: { 'newAccessLevel': 'PREMIUM' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  @Expose()
  params?: Record<string, any>;
}

/**
 * Response DTO for paginated results
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items',
    type: 'array',
  })
  @Expose()
  items: T[];

  @ApiProperty({
    description: 'Total number of items',
    example: 150,
  })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  @Expose()
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  @Expose()
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  @Expose()
  totalPages: number;

  @ApiProperty({
    description: 'Whether there are more pages',
    example: true,
  })
  @Expose()
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Whether there are previous pages',
    example: false,
  })
  @Expose()
  hasPrevPage: boolean;
}

/**
 * DTO for file upload with validation
 */
export class FileUploadDto {
  @ApiProperty({
    description: 'File description',
    example: 'User profile picture',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  @Expose()
  description?: string;

  @ApiProperty({
    description: 'File category',
    example: 'profile',
    enum: ['profile', 'document', 'media', 'other'],
  })
  @IsOptional()
  @IsString()
  @IsEnum(['profile', 'document', 'media', 'other'])
  @Expose()
  category?: string = 'other';

  @ApiProperty({
    description: 'Tags for the file',
    example: ['important', 'personal'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim().toLowerCase());
    }
    return Array.isArray(value) ? value.map(v => String(v).trim().toLowerCase()) : value;
  })
  @Expose()
  tags?: string[];

  @ApiProperty({
    description: 'Whether file is public',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @Expose()
  isPublic?: boolean = false;
}