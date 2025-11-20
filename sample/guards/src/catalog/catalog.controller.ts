import { Controller, Get, Post, Body, Param, Delete, Headers, Query, UsePipes, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SecureEndpoint } from '../security/decorators/secure.decorator';
import { SkipAuth } from '../security/decorators/skip-auth.decorator';
import { AccessLevel } from '../enums/access-level.enum';
import { CatalogService } from './catalog.service';
// import { CacheInterceptor, PerformanceInterceptor, LoggingInterceptor } from '../interceptors/';
// import { CacheInterceptor } from '../interceptors/cache.interceptor';
// import { PerformanceInterceptor } from '../interceptors/logging.interceptor';
// import { LoggingInterceptor } from '../interceptors/logging.interceptor';

import { 
  ValidationPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  TrimPipe,
  ParseBoolPipe,
  ParseArrayPipe,
  PaginationPipe,
  SearchValidationPipe,
  SecuritySanitizationPipe,
  AccessLevelValidationPipe 
} from '../pipes';
import { SearchDto, CreateUserDto, UpdateUserDto, PaginatedResponseDto } from '../dto/user.dto';
import { CacheInterceptor } from '../interceptors/cache.interceptor';
import { PerformanceInterceptor } from 'src/interceptors/performance.interceptor';
import { LoggingInterceptor } from 'src/interceptors/logging.interceptor';

@ApiTags('Catalog')
@Controller('catalog')
@ApiBearerAuth()
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    @Inject(CacheInterceptor)
    private readonly cacheInterceptor: CacheInterceptor,
    @Inject(PerformanceInterceptor)
    private readonly performanceInterceptor: PerformanceInterceptor,
    @Inject(LoggingInterceptor)
    private readonly loggingInterceptor: LoggingInterceptor,
  ) {}

  @Get()
  @SkipAuth()
  @ApiOperation({ summary: 'Get all catalog items (public)' })
  findAll() {
    return this.catalogService.findAll();
  }

  @Get('premium')
  @SecureEndpoint(AccessLevel.PREMIUM)
  @ApiOperation({ 
    summary: 'Get premium items (premium access required)',     
  })
  findPremiumItems(
    @Headers('authorization') authorization?: string,
  ) {
    console.log('Inside findPremiumItems method');
    console.log('Authorization header received:', authorization);
    
    if (!authorization) {
      console.log('No authorization header found!');
    } else {
      console.log('Authorization header exists:', authorization);
    }
    
    return this.catalogService.findPremiumItems();
  }

  @Get('search')
  @SkipAuth()
  @UseInterceptors(CacheInterceptor, PerformanceInterceptor) // Cache search results and monitor performance
  @ApiOperation({ 
    summary: 'Search catalog items with pagination and filtering',
    description: 'Demonstrates multiple pipes: SearchValidationPipe, PaginationPipe, SecuritySanitizationPipe. Uses CacheInterceptor for performance.'
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search term', example: 'laptop' })
  @ApiQuery({ name: 'category', required: false, description: 'Category filter', example: 'electronics' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field', example: 'name' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order', example: 'asc' })
  @ApiResponse({ status: 200, description: 'Search results with pagination' })
  searchItems(
    @Query('q', new SecuritySanitizationPipe({ maxLength: 100, preventXss: true }))
    searchTerm?: string,
    
    @Query('category', new TrimPipe({ toLowerCase: true, maxLength: 50 }))
    category?: string,
    
    @Query('page', new ParseIntPipe({ optional: true, min: 1, max: 10000 }))
    page?: number,
    
    @Query('limit', new ParseIntPipe({ optional: true, min: 1, max: 100 }))
    limit?: number,
    
    @Query('sortBy', new TrimPipe({ toLowerCase: true, maxLength: 30 }))
    sortBy?: string,
    
    @Query('sortOrder', new TrimPipe({ toLowerCase: true }))
    sortOrder?: string,
    
    @Query('tags', new ParseArrayPipe({ 
      separator: ',', 
      itemType: 'string', 
      maxItems: 5, 
      optional: true 
    }))
    tags?: string[]
  ) {
    const paginationParams = { page: page || 1, limit: limit || 10 };
    const pagination = new PaginationPipe().transform(paginationParams, { data: 'pagination' } as any);
    
    return this.catalogService.searchItems({
      searchTerm,
      category,
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
      tags,
      pagination
    });
  }

  @Get(':id')
  @SkipAuth()
  @ApiOperation({ 
    summary: 'Get catalog item by ID',
    description: 'Demonstrates ParseUUIDPipe for parameter validation'
  })
  @ApiParam({ name: 'id', description: 'Item UUID', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @ApiResponse({ status: 200, description: 'Item found' })
  @ApiResponse({ status: 400, description: 'Invalid UUID format' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) 
    id: string
  ) {
    return this.catalogService.findOne(id);
  }

  @Post('users')
  @SecureEndpoint(AccessLevel.ADMIN)
  @ApiOperation({ 
    summary: 'Create a new user',
    description: 'Demonstrates ValidationPipe with DTO validation'
  })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @UsePipes(new ValidationPipe())
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.catalogService.createUser(createUserDto);
  }

  @Post('users/:id')
  @SecureEndpoint(AccessLevel.PREMIUM)
  @ApiOperation({ 
    summary: 'Update user information',
    description: 'Demonstrates multiple pipes: ParseUUIDPipe and ValidationPipe'
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid UUID' })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateUser(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ValidationPipe()) updateUserDto: UpdateUserDto
  ) {
    return this.catalogService.updateUser(id, updateUserDto);
  }

  @Get('admin/users')
  @SecureEndpoint(AccessLevel.ADMIN)
  @UseInterceptors(LoggingInterceptor, PerformanceInterceptor) // Enhanced logging and performance monitoring for admin operations
  @ApiOperation({ 
    summary: 'Advanced user search with complex filtering',
    description: 'Demonstrates SearchValidationPipe and AccessLevelValidationPipe. Enhanced logging for admin operations.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search parameters as JSON or query string' })
  @ApiQuery({ name: 'accessLevel', required: false, enum: AccessLevel, description: 'Filter by access level' })
  @ApiQuery({ name: 'includeInactive', required: false, description: 'Include inactive users' })
  searchUsers(
    @Query('search', new SearchValidationPipe({ 
      minLength: 2, 
      maxLength: 200, 
      allowedFields: ['name', 'email', 'accessLevel'],
      preventInjection: true 
    }))
    search?: any,
    
    @Query('accessLevel', new AccessLevelValidationPipe({ 
      allowedLevels: [AccessLevel.STANDARD, AccessLevel.PREMIUM, AccessLevel.ADMIN] 
    }))
    accessLevel?: AccessLevel,
    
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean
  ) {
    return this.catalogService.searchUsers({
      search,
      accessLevel,
      includeInactive: includeInactive || false
    });
  }

  @Delete('users/bulk')
  @SecureEndpoint(AccessLevel.ADMIN)
  @ApiOperation({ 
    summary: 'Bulk delete users',
    description: 'Demonstrates array validation with UUID parsing'
  })
  @ApiResponse({ status: 200, description: 'Users deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid user IDs' })
  bulkDeleteUsers(
    @Query('ids', new ParseArrayPipe({ 
      separator: ',', 
      itemType: 'string', 
      maxItems: 50,
      minItems: 1 
    }))
    userIds: string[]
  ) {
    // Additional UUID validation for each ID
    const validatedIds = userIds.map(id => 
      new ParseUUIDPipe().transform(id, { data: 'id' } as any)
    ).filter((id): id is string => id !== undefined);
    
    return this.catalogService.bulkDeleteUsers(validatedIds);
  }

}