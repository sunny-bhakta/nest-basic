import { Controller, Post, Body, UseFilters, UseGuards, UsePipes, Get, UseInterceptors, Param, Delete, Put, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiBearerAuth, ApiOkResponse, ApiCreatedResponse, ApiBadRequestResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { CatsService } from './cats.service';
import { CatsModuleRefService } from './cats-module-ref.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { PaginationDto } from './dto/pagination.dto';
import { MultiSortDto } from './dto/multi-sort.dto';
import { CatDto, PaginatedCatsResponseDto, MultiSortedCatsResponseDto, SearchResponseDto, AgeRangeResponseDto, CountResponseDto, ModuleRefResponseDto, ProviderInfoResponseDto } from './dto/cat-response.dto';
import { HttpExceptionFilter } from '../http-exception/http-exception.filter';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { ValidationPipe } from '../validation/validation.pipe';
import { LoggingInterceptor } from '../logging/logging.interceptor';


@ApiTags('Cats')
@UseInterceptors(LoggingInterceptor)
@Controller('cats')
@UseFilters(HttpExceptionFilter) // Apply exception filter to all routes in this controller

         // Apply guard to all routes in this controller
export class CatsController {
  constructor(
    private readonly catsService: CatsService,
    private readonly catsModuleRefService: CatsModuleRefService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all cats', description: 'Returns a list of all cats in the system' })
  @ApiOkResponse({ 
    description: 'List of cats returned successfully',
    type: [CatDto]
  })
  getAll() {
    return this.catsService.getCats();
  }

  @Get('storage-info')
  @ApiOperation({ summary: 'Get storage information', description: 'Returns information about the cats storage system' })
  @ApiOkResponse({ 
    description: 'Storage information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalCats: { type: 'number' },
        storageType: { type: 'string' },
        configuration: { type: 'object' }
      }
    }
  })
  getStorageInfo() {
    return this.catsService.getStorageInfo();
  }

  @Get(':name')
  @ApiOperation({ summary: 'Get cat by name', description: 'Returns a specific cat by its name' })
  @ApiParam({ name: 'name', description: 'Name of the cat to retrieve', example: 'Fluffy' })
  @ApiOkResponse({ 
    description: 'Cat found and returned successfully',
    type: CatDto
  })
  @ApiNotFoundResponse({ description: 'Cat not found' })
  getCatByName(@Param('name') name: string) {
    return this.catsService.getCatByName(name);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new cat', description: 'Creates a new cat with admin role required' })
  @ApiBody({ type: CreateCatDto, description: 'Cat data to create' })
  @ApiBearerAuth('JWT-auth')
  @ApiCreatedResponse({ 
    description: 'Cat created successfully',
    type: CatDto
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @Roles('admin') // Only users with 'admin' role can access
  @UseGuards(RolesGuard)  
  @UsePipes(ValidationPipe) // Validate request body
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.createCat(createCatDto);
  }

  @Post("/validation-pipe")
  @ApiOperation({ summary: 'Create cat with validation', description: 'Creates a new cat with enhanced validation pipeline' })
  @ApiBody({ type: CreateCatDto, description: 'Cat data to create with validation' })
  @ApiCreatedResponse({ 
    description: 'Cat created successfully with validation',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Fluffy' },
        age: { type: 'number', example: 3 },
        breed: { type: 'string', example: 'Persian' },
        validationInfo: { type: 'object' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @UsePipes(ValidationPipe)
  createWithValidation(@Body() createCatDto: CreateCatDto) {
    return this.catsService.createCat(createCatDto);
  }

  @Put(':name')
  @ApiOperation({ summary: 'Update cat by name', description: 'Updates an existing cat by its name' })
  @ApiParam({ name: 'name', description: 'Name of the cat to update', example: 'Fluffy' })
  @ApiBody({ 
    description: 'Partial cat data to update',
    schema: {
      type: 'object',
      properties: {
        age: { type: 'number', example: 4 },
        breed: { type: 'string', example: 'Maine Coon' }
      }
    }
  })
  @ApiOkResponse({ 
    description: 'Cat updated successfully',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Fluffy' },
        age: { type: 'number', example: 4 },
        breed: { type: 'string', example: 'Maine Coon' }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Cat not found' })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @UsePipes(ValidationPipe)
  updateCat(@Param('name') name: string, @Body() updateData: Partial<CreateCatDto>) {
    return this.catsService.updateCat(name, updateData);
  }

  @Delete(':name')
  @ApiOperation({ summary: 'Delete cat by name', description: 'Deletes a cat by its name' })
  @ApiParam({ name: 'name', description: 'Name of the cat to delete', example: 'Fluffy' })
  @ApiOkResponse({ 
    description: 'Cat deleted successfully',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean', example: true }
      }
    }
  })
  @ApiNotFoundResponse({ description: 'Cat not found' })
  deleteCat(@Param('name') name: string) {
    return { deleted: this.catsService.deleteCat(name) };
  }

  // ModuleRef demonstration endpoints
  @Get('module-ref/cats')
  @ApiOperation({ 
    summary: 'Get cats via ModuleRef', 
    description: 'Demonstrates accessing cats service through ModuleRef for dynamic provider resolution' 
  })
  @ApiOkResponse({ 
    description: 'Cats retrieved successfully via ModuleRef',
    schema: {
      type: 'object',
      properties: {
        cats: { type: 'array', items: { type: 'object' } },
        source: { type: 'string', example: 'ModuleRef' }
      }
    }
  })
  getCatsViaModuleRef() {
    return this.catsModuleRefService.getAllCatsViaModuleRef();
  }

  @Get('module-ref/module-info')
  @ApiOperation({ 
    summary: 'Get module information', 
    description: 'Returns information about the current module context and available providers' 
  })
  @ApiOkResponse({ 
    description: 'Module information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        moduleType: { type: 'string' },
        providers: { type: 'array', items: { type: 'string' } },
        imports: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  getModuleInfo() {
    return this.catsModuleRefService.getModuleInfo();
  }

  @Get('module-ref/services-info')
  @ApiOperation({ 
    summary: 'Get services information', 
    description: 'Returns detailed information about available services in the module context' 
  })
  @ApiOkResponse({ 
    description: 'Services information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        availableServices: { type: 'array', items: { type: 'string' } },
        serviceDetails: { type: 'object' }
      }
    }
  })
  getServicesInfo() {
    return this.catsModuleRefService.getServicesInfo();
  }

  @Get('module-ref/conditional-access')
  @ApiOperation({ 
    summary: 'Conditional provider access', 
    description: 'Demonstrates conditional access to providers based on query parameter' 
  })
  @ApiQuery({ 
    name: 'provider', 
    required: false, 
    description: 'Provider name to access conditionally',
    example: 'CatsService'
  })
  @ApiOkResponse({ 
    description: 'Provider accessed conditionally',
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        result: { type: 'object' },
        accessible: { type: 'boolean' }
      }
    }
  })
  conditionalAccess(@Query('provider') provider: string) {
    return this.catsModuleRefService.conditionalAccess(provider || 'CatsService');
  }

  @Get('module-ref/has-provider')
  @ApiOperation({ 
    summary: 'Check provider availability', 
    description: 'Checks if specific providers are available in the current module context' 
  })
  @ApiQuery({ 
    name: 'provider', 
    required: false, 
    description: 'Specific provider to check',
    example: 'CatsService'
  })
  @ApiOkResponse({ 
    description: 'Provider availability checked successfully',
    schema: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        results: { 
          type: 'object',
          properties: {
            CatsService: { type: 'boolean' },
            CATS_MODULE_OPTIONS: { type: 'boolean' }
          }
        }
      }
    }
  })
  hasProvider(@Query('provider') provider: string) {
    const providerMap = {
      'CatsService': this.catsModuleRefService.hasProvider('CatsService'),
      'CATS_MODULE_OPTIONS': this.catsModuleRefService.hasProvider('CATS_MODULE_OPTIONS'),
    };
    
    return {
      provider: provider || 'all',
      results: provider ? { [provider]: providerMap[provider] } : providerMap,
    };
  }

  @Post('module-ref/create-instance')
  @ApiOperation({ 
    summary: 'Create new service instance', 
    description: 'Creates a new instance of CatsService using ModuleRef for dependency injection' 
  })
  @ApiCreatedResponse({ 
    description: 'New service instance created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        instanceType: { type: 'string', example: 'new' },
        cats: { type: 'array' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async createNewInstance() {
    const newInstance = await this.catsModuleRefService.createCatsServiceInstance();
    const cats = newInstance.getCats();
    return {
      message: 'Created new CatsService instance via ModuleRef',
      instanceType: 'new',
      cats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('module-ref/async-service')
  @ApiOperation({ 
    summary: 'Get service asynchronously', 
    description: 'Retrieves CatsService asynchronously using ModuleRef for advanced provider resolution' 
  })
  @ApiOkResponse({ 
    description: 'Service retrieved asynchronously',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        cats: { type: 'array' },
        storageInfo: { type: 'object' }
      }
    }
  })
  async getAsyncService() {
    const service = await this.catsModuleRefService.getCatsServiceAsync();
    return {
      message: 'Retrieved CatsService asynchronously via ModuleRef',
      cats: service.getCats(),
      storageInfo: service.getStorageInfo(),
    };
  }

  // Pagination endpoints
  @Get('paginated')
  @ApiOperation({ 
    summary: 'Get paginated cats', 
    description: 'Returns cats with pagination support including metadata and navigation links' 
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiQuery({ name: 'skip', required: false, description: 'Number of items to skip', example: 0 })
  @ApiOkResponse({ 
    description: 'Paginated cats retrieved successfully',
    type: PaginatedCatsResponseDto
  })
  @UsePipes(ValidationPipe)
  getPaginatedCats(@Query() paginationDto: PaginationDto, @Req() req: any) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getPaginatedCats(paginationDto, baseUrl);
  }

  @Get('search')
  @ApiOperation({ 
    summary: 'Search cats with pagination', 
    description: 'Searches cats by name or breed with pagination support' 
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search term for cat name or breed', example: 'fluffy' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Search results retrieved successfully',
    type: SearchResponseDto
  })
  @UsePipes(ValidationPipe)
  searchCats(
    @Query('q') searchTerm: string = '',
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.searchCats(searchTerm, paginationDto, baseUrl);
  }

  @Get('age-range')
  @ApiOperation({ 
    summary: 'Get cats by age range', 
    description: 'Filters cats by age range with pagination support' 
  })
  @ApiQuery({ name: 'minAge', required: false, description: 'Minimum age filter', example: 1 })
  @ApiQuery({ name: 'maxAge', required: false, description: 'Maximum age filter', example: 10 })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Age-filtered cats retrieved successfully',
    type: AgeRangeResponseDto
  })
  @UsePipes(ValidationPipe)
  getCatsByAgeRange(
    @Query('minAge') minAge: string = '0',
    @Query('maxAge') maxAge: string = '100',
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getCatsByAgeRange(
      parseInt(minAge, 10),
      parseInt(maxAge, 10),
      paginationDto,
      baseUrl,
    );
  }

  @Get('sorted')
  @ApiOperation({ 
    summary: 'Get sorted cats', 
    description: 'Returns cats sorted by a single field with pagination support' 
  })
  @ApiQuery({ 
    name: 'sortBy', 
    required: false, 
    description: 'Field to sort by',
    enum: ['name', 'age'],
    example: 'name'
  })
  @ApiQuery({ 
    name: 'sortOrder', 
    required: false, 
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (1-based)', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page', example: 10 })
  @ApiOkResponse({ 
    description: 'Sorted cats retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        sortInfo: {
          type: 'object',
          properties: {
            sortBy: { type: 'string' },
            sortOrder: { type: 'string' }
          }
        },
        pagination: { type: 'object' },
        links: { type: 'object' }
      }
    }
  })
  @UsePipes(ValidationPipe)
  getSortedCats(
    @Query('sortBy') sortBy: 'name' | 'age' = 'name',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getSortedCats(sortBy, sortOrder, paginationDto, baseUrl);
  }

  @Get('count')
  @ApiOperation({ 
    summary: 'Get total cat count', 
    description: 'Returns the total number of cats in the system' 
  })
  @ApiOkResponse({ 
    description: 'Total count retrieved successfully',
    type: CountResponseDto
  })
  getTotalCount() {
    return {
      total: this.catsService.getTotalCount(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('multi-sorted')
  @ApiOperation({ 
    summary: 'Get multi-field sorted cats', 
    description: 'Returns cats sorted by multiple fields with priority-based ordering and pagination' 
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
    description: 'Multi-sorted cats retrieved successfully',
    type: MultiSortedCatsResponseDto
  })
  @UsePipes(ValidationPipe)
  getMultiSortedCats(
    @Query('sort') sort: string | string[] = ['name:asc'],
    @Query() paginationDto: PaginationDto,
    @Req() req: any,
  ) {
    const multiSortDto = new MultiSortDto();
    multiSortDto.sort = MultiSortDto.fromQueryParams(sort);

    const baseUrl = `${req.protocol}://${req.get('host')}${req.route.path}`;
    return this.catsService.getMultiSortedCats(multiSortDto, paginationDto, baseUrl);
  }

  @Get('sort-help')
  @ApiOperation({ 
    summary: 'Get sorting help', 
    description: 'Returns comprehensive help documentation for multi-field sorting capabilities' 
  })
  @ApiOkResponse({ 
    description: 'Sorting help retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        usage: {
          type: 'object',
          properties: {
            singleField: { type: 'string' },
            multipleFields: { type: 'string' },
            withPagination: { type: 'string' },
            withSearch: { type: 'string' }
          }
        },
        examples: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    }
  })
  getSortHelp() {
    return {
      message: 'Multi-field sorting help',
      usage: {
        singleField: 'GET /cats/multi-sorted?sort=name:asc',
        multipleFields: 'GET /cats/multi-sorted?sort=age:desc&sort=name:asc',
        withPagination: 'GET /cats/multi-sorted?sort=age:desc,name:asc&page=1&limit=5',
        withSearch: 'GET /cats/search?q=whiskers&sort=age:desc&sort=name:asc'
      },
      examples: [
        {
          description: 'Sort by name ascending',
          url: '/cats/multi-sorted?sort=name:asc&limit=3'
        },
        {
          description: 'Sort by age descending, then name ascending',
          url: '/cats/multi-sorted?sort=age:desc&sort=name:asc&limit=3'
        },
        {
          description: 'Advanced examples available at',
          url: '/cats/pagination-examples/sort-examples'
        }
      ]
    };
  }
}