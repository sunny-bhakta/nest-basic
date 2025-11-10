import { Controller, Get, Query, UsePipes, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { CatsService } from './cats.service';
import { PaginationDto } from './dto/pagination.dto';
import { MultiSortDto, CatSortField, SortOrder } from './dto/multi-sort.dto';
import { ValidationPipe } from '../validation/validation.pipe';
import type { PaginatedResponse } from './interfaces/pagination.interface';
import type { Cat } from './cats.service';

@ApiTags('Cats - Pagination Examples')
@Controller('cats/pagination-examples')
export class CatsPaginationController {
  constructor(private readonly catsService: CatsService) {}

  @Get('basic')
  @ApiOperation({ 
    summary: 'Basic pagination example', 
    description: 'Demonstrates basic pagination using PaginationDto with automatic skip/page calculation' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of items to skip', example: 0 })
  @ApiOkResponse({ 
    description: 'Basic pagination results',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: {
          type: 'object',
          properties: {
            currentPage: { type: 'number' },
            totalPages: { type: 'number' },
            totalItems: { type: 'number' },
            itemsPerPage: { type: 'number' }
          }
        }
      }
    }
  })
  @UsePipes(ValidationPipe)
  basicPagination(@Query() paginationDto: PaginationDto, @Req() req: any): PaginatedResponse<Cat> {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getPaginatedCats(paginationDto, baseUrl);
  }

  @Get('with-page-number')
  @ApiOperation({ 
    summary: 'Pagination with explicit page numbers', 
    description: 'Example of pagination using explicit page and limit parameters with manual DTO construction' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 5 })
  @ApiOkResponse({ 
    description: 'Page-based pagination results',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: { type: 'object' },
        links: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  paginationWithPageNumber(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '5',
    @Req() req: any,
  ): PaginatedResponse<Cat> {
    const paginationDto = new PaginationDto();
    paginationDto.page = parseInt(page, 10);
    paginationDto.limit = parseInt(limit, 10);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getPaginatedCats(paginationDto, baseUrl);
  }

  @Get('with-skip-offset')
  @ApiOperation({ 
    summary: 'Pagination with skip/offset', 
    description: 'Example of pagination using skip and limit parameters (offset-based pagination)' 
  })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of items to skip', example: 0 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 5 })
  @ApiOkResponse({ 
    description: 'Skip-based pagination results',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: { type: 'object' },
        links: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  paginationWithSkipOffset(
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '5',
    @Req() req: any,
  ): PaginatedResponse<Cat> {
    const paginationDto = new PaginationDto();
    paginationDto.skip = parseInt(skip, 10);
    paginationDto.limit = parseInt(limit, 10);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getPaginatedCats(paginationDto, baseUrl);
  }

  @Get('advanced-search')
  @ApiOperation({ 
    summary: 'Advanced search with pagination', 
    description: 'Combines search capabilities (name or age range) with pagination. Demonstrates conditional filtering logic.' 
  })
  @ApiQuery({ name: 'name', required: false, description: 'Search by cat name', example: 'fluffy' })
  @ApiQuery({ name: 'minAge', required: false, description: 'Minimum age filter', example: 1 })
  @ApiQuery({ name: 'maxAge', required: false, description: 'Maximum age filter', example: 10 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Advanced search results with pagination',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        searchCriteria: { type: 'object' },
        meta: { type: 'object' },
        links: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  advancedSearchWithPagination(
    @Query('name') name?: string,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
    @Query() paginationDto?: PaginationDto,
    @Req() req?: any,
  ): PaginatedResponse<Cat> {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    
    // If name search is provided
    if (name) {
      return this.catsService.searchCats(name, paginationDto!, baseUrl);
    }
    
    // If age range is provided
    if (minAge || maxAge) {
      const min = minAge ? parseInt(minAge, 10) : 0;
      const max = maxAge ? parseInt(maxAge, 10) : 100;
      return this.catsService.getCatsByAgeRange(min, max, paginationDto!, baseUrl);
    }
    
    // Default to basic pagination
    return this.catsService.getPaginatedCats(paginationDto!, baseUrl);
  }

  @Get('large-limit')
  @ApiOperation({ 
    summary: 'Pagination with limit validation', 
    description: 'Demonstrates server-side validation of pagination limits with custom error handling' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page (max 50)', example: 10 })
  @ApiOkResponse({ 
    description: 'Paginated results with enforced limits',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: { type: 'object' },
        limits: { 
          type: 'object',
          properties: {
            maxAllowed: { type: 'number', example: 50 },
            requested: { type: 'number' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Limit too large. Maximum is 50.' })
  @UsePipes(ValidationPipe)
  testLargeLimit(@Query() paginationDto: PaginationDto, @Req() req: any) {
    // Test what happens with large limits
    if (paginationDto.limit && paginationDto.limit > 50) {
      throw new BadRequestException('Limit too large for this endpoint. Maximum is 50.');
    }
    
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getPaginatedCats(paginationDto, baseUrl);
  }

  @Get('custom-validation')
  @ApiOperation({ 
    summary: 'Custom validation example', 
    description: 'Demonstrates custom validation logic for pagination parameters with specific business rules' 
  })
  @ApiQuery({ name: 'page', required: true, description: 'Page number (must be positive integer)', example: 1 })
  @ApiQuery({ name: 'limit', required: true, description: 'Items per page (1-20)', example: 10 })
  @ApiOkResponse({ 
    description: 'Custom validated pagination results',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        validation: { 
          type: 'object',
          properties: {
            passed: { type: 'boolean' },
            rules: { type: 'array', items: { type: 'string' } }
          }
        },
        meta: { type: 'object' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Custom validation failed' })
  customValidatedPagination(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: any,
  ) {
    // Custom validation example
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('Page must be a positive integer');
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 20) {
      throw new BadRequestException('Limit must be between 1 and 20');
    }

    const paginationDto = new PaginationDto();
    paginationDto.page = pageNum;
    paginationDto.limit = limitNum;

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getPaginatedCats(paginationDto, baseUrl);
  }

  @Get('metadata-only')
  @ApiOperation({ 
    summary: 'Pagination metadata only', 
    description: 'Returns only pagination metadata without actual data. Useful for performance optimization.' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Pagination metadata without data',
    schema: {
      type: 'object',
      properties: {
        pagination: { type: 'object' },
        message: { type: 'string' },
        example: { type: 'string' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  getMetadataOnly(@Query() paginationDto: PaginationDto) {
    const response = this.catsService.getPaginatedCats(paginationDto);
    
    // Return only metadata, not the actual data
    return {
      pagination: response.meta,
      message: 'This endpoint returns only pagination metadata',
      example: 'Use this to check pagination info without transferring large datasets',
    };
  }

  @Get('comparison')
  @ApiOperation({ 
    summary: 'Page vs Skip comparison', 
    description: 'Compares page-based and skip-based pagination approaches side by side' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number for comparison', example: 2 })
  @ApiQuery({ name: 'skip', required: false, description: 'Skip value for comparison', example: 10 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 3 })
  @ApiOkResponse({ 
    description: 'Comparison results between page and skip approaches',
    schema: {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        total: { type: 'number' },
        examples: {
          type: 'object',
          properties: {
            usingPage: { type: 'object' },
            usingSkip: { type: 'object' }
          }
        }
      }
    }
  })
  @UsePipes(ValidationPipe)
  comparePageVsSkip(
    @Query('page') page?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit: string = '3',
  ) {
    const limitNum = parseInt(limit, 10);

    const results: any = {
      limit: limitNum,
      total: this.catsService.getTotalCount(),
      examples: {},
    };

    if (page) {
      const pageDto = new PaginationDto();
      pageDto.page = parseInt(page, 10);
      pageDto.limit = limitNum;
      
      const pageResult = this.catsService.getPaginatedCats(pageDto);
      results.examples.usingPage = {
        input: { page: pageDto.page, limit: pageDto.limit },
        calculatedSkip: pageDto.getSkip(),
        result: pageResult.meta,
      };
    }

    if (skip) {
      const skipDto = new PaginationDto();
      skipDto.skip = parseInt(skip, 10);
      skipDto.limit = limitNum;
      
      const skipResult = this.catsService.getPaginatedCats(skipDto);
      results.examples.usingSkip = {
        input: { skip: skipDto.skip, limit: skipDto.limit },
        calculatedPage: skipDto.getCurrentPage(),
        result: skipResult.meta,
      };
    }

    return results;
  }

  // Multi-field sorting endpoints
  @Get('multi-sort')
  @ApiOperation({ 
    summary: 'Multi-field sorting with pagination', 
    description: 'Demonstrates multi-field sorting capabilities with priority-based ordering and pagination' 
  })
  @ApiQuery({ 
    name: 'sort', 
    required: false, 
    description: 'Sort criteria in format "field:order". Can be repeated for multiple fields.',
    example: 'age:desc',
    isArray: true
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Multi-sorted cats with pagination',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        sortInfo: {
          type: 'object',
          properties: {
            appliedSorts: { type: 'array', items: { type: 'object' } }
          }
        },
        meta: { type: 'object' },
        links: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  multiFieldSort(
    @Query('sort') sort: string | string[],
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ): PaginatedResponse<Cat> {
    const multiSortDto = new MultiSortDto();
    multiSortDto.sort = MultiSortDto.fromQueryParams(sort);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getMultiSortedCats(multiSortDto, paginationDto, baseUrl);
  }

  @Get('multi-sort-search')
  @ApiOperation({ 
    summary: 'Multi-sort with search', 
    description: 'Combines text search with multi-field sorting and pagination' 
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search term for cat name or breed', example: 'fluffy' })
  @ApiQuery({ 
    name: 'sort', 
    required: false, 
    description: 'Sort criteria in format "field:order"',
    example: 'name:asc',
    isArray: true
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Search results with multi-field sorting',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        searchTerm: { type: 'string' },
        sortInfo: { type: 'object' },
        meta: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  multiSortSearch(
    @Query('q') searchTerm: string = '',
    @Query('sort') sort: string | string[] = ['name:asc'],
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ): PaginatedResponse<Cat> {
    const multiSortDto = new MultiSortDto();
    multiSortDto.sort = MultiSortDto.fromQueryParams(sort);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.searchCatsWithMultiSort(searchTerm, multiSortDto, paginationDto, baseUrl);
  }

  @Get('multi-sort-age-range')
  @ApiOperation({ 
    summary: 'Multi-sort with age range filtering', 
    description: 'Filters cats by age range with multi-field sorting and pagination' 
  })
  @ApiQuery({ name: 'minAge', required: false, description: 'Minimum age filter', example: 0 })
  @ApiQuery({ name: 'maxAge', required: false, description: 'Maximum age filter', example: 100 })
  @ApiQuery({ 
    name: 'sort', 
    required: false, 
    description: 'Sort criteria in format "field:order"',
    example: 'age:asc',
    isArray: true
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Age-filtered cats with multi-field sorting',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        ageRange: { type: 'object' },
        sortInfo: { type: 'object' },
        meta: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  multiSortAgeRange(
    @Query('minAge') minAge: string = '0',
    @Query('maxAge') maxAge: string = '100',
    @Query('sort') sort: string | string[] = ['age:asc', 'name:asc'],
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ): PaginatedResponse<Cat> {
    const multiSortDto = new MultiSortDto();
    multiSortDto.sort = MultiSortDto.fromQueryParams(sort);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getCatsByAgeRangeWithMultiSort(
      parseInt(minAge, 10),
      parseInt(maxAge, 10),
      multiSortDto,
      paginationDto,
      baseUrl,
    );
  }

  @Get('complex-multi-sort')
  @ApiOperation({ 
    summary: 'Complex multi-field sorting', 
    description: 'Advanced multi-field sorting with explicit primary, secondary, and tertiary sort parameters' 
  })
  @ApiQuery({ name: 'primarySort', required: false, description: 'Primary sort field:order', example: 'name:asc' })
  @ApiQuery({ name: 'secondarySort', required: false, description: 'Secondary sort field:order', example: 'age:desc' })
  @ApiQuery({ name: 'tertiarySort', required: false, description: 'Tertiary sort field:order', example: 'breed:asc' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Complex multi-sorted cats with pagination',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        sortInfo: {
          type: 'object',
          properties: {
            primary: { type: 'string' },
            secondary: { type: 'string' },
            tertiary: { type: 'string' },
            appliedSorts: { type: 'array' }
          }
        },
        meta: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  complexMultiSort(
    @Query('primarySort') primarySort: string = 'name:asc',
    @Query('secondarySort') secondarySort?: string,
    @Query('tertiarySort') tertiarySort?: string,
    @Query() paginationDto?: PaginationDto,
    @Req() req?: any,
  ): PaginatedResponse<Cat> {
    const sortArray = [primarySort];
    if (secondarySort) sortArray.push(secondarySort);
    if (tertiarySort) sortArray.push(tertiarySort);

    const multiSortDto = new MultiSortDto();
    multiSortDto.sort = MultiSortDto.fromQueryParams(sortArray);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getMultiSortedCats(multiSortDto, paginationDto!, baseUrl);
  }

  @Get('sort-examples')
  @ApiOperation({ 
    summary: 'Sorting examples and documentation', 
    description: 'Comprehensive guide to all available sorting options and query formats' 
  })
  @ApiOkResponse({ 
    description: 'Sorting examples and documentation',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        examples: {
          type: 'object',
          properties: {
            basic: { type: 'object' },
            multiField: { type: 'object' },
            singleParam: { type: 'object' },
            withSearch: { type: 'object' },
            ageRangeSort: { type: 'object' },
            complexSort: { type: 'object' }
          }
        },
        supportedFields: { type: 'array', items: { type: 'string' } },
        supportedOrders: { type: 'array', items: { type: 'string' } },
        queryFormats: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  getSortExamples() {
    return {
      message: 'Multi-field sorting examples',
      examples: {
        basic: {
          description: 'Sort by name ascending',
          url: '/cats/pagination-examples/multi-sort?sort=name:asc&page=1&limit=5'
        },
        multiField: {
          description: 'Sort by age descending, then name ascending',
          url: '/cats/pagination-examples/multi-sort?sort=age:desc&sort=name:asc&page=1&limit=5'
        },
        singleParam: {
          description: 'Multiple sorts in single parameter (comma-separated)',
          url: '/cats/pagination-examples/multi-sort?sort=age:desc,name:asc&page=1&limit=5'
        },
        withSearch: {
          description: 'Search with multi-field sorting',
          url: '/cats/pagination-examples/multi-sort-search?q=cat&sort=age:desc&sort=name:asc&page=1&limit=3'
        },
        ageRangeSort: {
          description: 'Age range with multi-field sorting',
          url: '/cats/pagination-examples/multi-sort-age-range?minAge=1&maxAge=5&sort=age:asc&sort=name:desc&page=1&limit=4'
        },
        complexSort: {
          description: 'Complex multi-field sorting with separate parameters',
          url: '/cats/pagination-examples/complex-multi-sort?primarySort=age:desc&secondarySort=name:asc&page=1&limit=3'
        }
      },
      supportedFields: Object.values(CatSortField),
      supportedOrders: Object.values(SortOrder),
      queryFormats: [
        'Single field: ?sort=name:asc',
        'Multiple params: ?sort=age:desc&sort=name:asc',
        'Comma-separated: ?sort=age:desc,name:asc',
        'Array format: ?sort[]=age:desc&sort[]=name:asc'
      ]
    };
  }

  @Get('sort-statistics')
  @ApiOperation({ 
    summary: 'Field statistics for sorting', 
    description: 'Returns statistical information about sortable fields to help with sorting decisions' 
  })
  @ApiOkResponse({ 
    description: 'Field statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        statistics: { type: 'object' },
        totalCats: { type: 'number' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  getSortStatistics() {
    return {
      message: 'Field statistics for sorting',
      statistics: this.catsService.getSortingStats(),
      totalCats: this.catsService.getTotalCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('field-values')
  @ApiOperation({ 
    summary: 'Get unique field values', 
    description: 'Returns unique values for a specified field, useful for understanding data distribution' 
  })
  @ApiQuery({ 
    name: 'field', 
    required: true, 
    description: 'Field name to get unique values for',
    enum: Object.values(CatSortField),
    example: 'name'
  })
  @ApiOkResponse({ 
    description: 'Unique field values retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        field: { type: 'string' },
        uniqueValues: { type: 'number' },
        values: { type: 'array', items: { type: 'string' } },
        canSortBy: { type: 'boolean' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid field name provided' })
  getFieldValues(@Query('field') field: string) {
    const validField = Object.values(CatSortField).includes(field as CatSortField);
    if (!validField) {
      throw new BadRequestException(`Invalid field: ${field}. Valid fields: ${Object.values(CatSortField).join(', ')}`);
    }

    const values = this.catsService.getUniqueFieldValues(field as CatSortField);
    return {
      field,
      uniqueValues: values.length,
      values: values,
      canSortBy: true,
    };
  }

  @Get('sort-comparison')
  @ApiOperation({ 
    summary: 'Compare sorting strategies', 
    description: 'Compares two different sorting strategies side by side with analysis of differences' 
  })
  @ApiQuery({ 
    name: 'sort1', 
    required: false, 
    description: 'First sorting strategy to compare',
    example: 'name:asc'
  })
  @ApiQuery({ 
    name: 'sort2', 
    required: false, 
    description: 'Second sorting strategy to compare',
    example: 'age:desc,name:asc'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Sorting comparison results',
    schema: {
      type: 'object',
      properties: {
        comparison: {
          type: 'object',
          properties: {
            sort1: {
              type: 'object',
              properties: {
                criteria: { type: 'string' },
                parsed: { type: 'array' },
                results: { type: 'array' },
                meta: { type: 'object' }
              }
            },
            sort2: {
              type: 'object',
              properties: {
                criteria: { type: 'string' },
                parsed: { type: 'array' },
                results: { type: 'array' },
                meta: { type: 'object' }
              }
            }
          }
        },
        analysis: {
          type: 'object',
          properties: {
            sameResults: { type: 'boolean' },
            firstDifference: { type: 'object' }
          }
        }
      }
    }
  })
  @UsePipes(ValidationPipe)
  sortComparison(
    @Query('sort1') sort1: string = 'name:asc',
    @Query('sort2') sort2: string = 'age:desc,name:asc',
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;

    // First sort
    const multiSort1 = new MultiSortDto();
    multiSort1.sort = MultiSortDto.fromQueryParams(sort1);
    const result1 = this.catsService.getMultiSortedCats(multiSort1, paginationDto, baseUrl);

    // Second sort  
    const multiSort2 = new MultiSortDto();
    multiSort2.sort = MultiSortDto.fromQueryParams(sort2);
    const result2 = this.catsService.getMultiSortedCats(multiSort2, paginationDto, baseUrl);

    return {
      comparison: {
        sort1: {
          criteria: sort1,
          parsed: multiSort1.getAllSortFields(),
          results: result1.data,
          meta: result1.meta,
        },
        sort2: {
          criteria: sort2,
          parsed: multiSort2.getAllSortFields(),
          results: result2.data,
          meta: result2.meta,
        }
      },
      analysis: {
        sameResults: JSON.stringify(result1.data) === JSON.stringify(result2.data),
        firstDifference: this.findFirstDifference(result1.data, result2.data),
      }
    };
  }

  private findFirstDifference(arr1: Cat[], arr2: Cat[]): { index: number; cat1: Cat; cat2: Cat } | null {
    const minLength = Math.min(arr1.length, arr2.length);
    for (let i = 0; i < minLength; i++) {
      if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) {
        return {
          index: i,
          cat1: arr1[i],
          cat2: arr2[i],
        };
      }
    }
    return null;
  }
}