import { ApiProperty } from '@nestjs/swagger';

export class CatDto {
  @ApiProperty({ 
    description: 'The name of the cat',
    example: 'Fluffy'
  })
  name: string;

  @ApiProperty({ 
    description: 'The age of the cat in years',
    example: 3,
    minimum: 0
  })
  age: number;

  @ApiProperty({ 
    description: 'The breed of the cat',
    example: 'Persian'
  })
  breed: string;
}

export class PaginationMetaDto {
  @ApiProperty({ 
    description: 'Current page number (1-based)',
    example: 1,
    minimum: 1
  })
  currentPage: number;

  @ApiProperty({ 
    description: 'Total number of pages',
    example: 5,
    minimum: 1
  })
  totalPages: number;

  @ApiProperty({ 
    description: 'Total number of items across all pages',
    example: 25,
    minimum: 0
  })
  totalItems: number;

  @ApiProperty({ 
    description: 'Number of items per page',
    example: 10,
    minimum: 1
  })
  itemsPerPage: number;

  @ApiProperty({ 
    description: 'Whether there is a next page available',
    example: true
  })
  hasNext: boolean;

  @ApiProperty({ 
    description: 'Whether there is a previous page available',
    example: false
  })
  hasPrevious: boolean;

  @ApiProperty({ 
    description: 'Number of items skipped',
    example: 0,
    minimum: 0
  })
  skip: number;
}

export class PaginationLinksDto {
  @ApiProperty({ 
    description: 'URL for the first page',
    example: '/cats/paginated?page=1&limit=10'
  })
  first: string;

  @ApiProperty({ 
    description: 'URL for the previous page',
    example: '/cats/paginated?page=1&limit=10',
    nullable: true
  })
  previous: string | null;

  @ApiProperty({ 
    description: 'URL for the next page',
    example: '/cats/paginated?page=3&limit=10',
    nullable: true
  })
  next: string | null;

  @ApiProperty({ 
    description: 'URL for the last page',
    example: '/cats/paginated?page=5&limit=10'
  })
  last: string;
}

export class PaginatedCatsResponseDto {
  @ApiProperty({ 
    description: 'Array of cats for the current page',
    type: [CatDto]
  })
  data: CatDto[];

  @ApiProperty({ 
    description: 'Pagination metadata',
    type: PaginationMetaDto
  })
  meta: PaginationMetaDto;

  @ApiProperty({ 
    description: 'Navigation links for pagination',
    type: PaginationLinksDto
  })
  links: PaginationLinksDto;
}

export class SortFieldDto {
  @ApiProperty({ 
    description: 'Field name being sorted',
    example: 'name',
    enum: ['name', 'age', 'breed']
  })
  field: string;

  @ApiProperty({ 
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc']
  })
  order: string;

  @ApiProperty({ 
    description: 'Priority of this sort field (lower number = higher priority)',
    example: 1,
    minimum: 1
  })
  priority: number;
}

export class SortInfoDto {
  @ApiProperty({ 
    description: 'Array of applied sort fields with their priorities',
    type: [SortFieldDto]
  })
  appliedSorts: SortFieldDto[];
}

export class MultiSortedCatsResponseDto extends PaginatedCatsResponseDto {
  @ApiProperty({ 
    description: 'Information about applied sorting',
    type: SortInfoDto
  })
  sortInfo: SortInfoDto;
}

export class SearchResponseDto extends PaginatedCatsResponseDto {
  @ApiProperty({ 
    description: 'The search term that was used',
    example: 'fluffy'
  })
  searchTerm: string;
}

export class AgeRangeResponseDto extends PaginatedCatsResponseDto {
  @ApiProperty({ 
    description: 'Age range filter that was applied',
    example: { min: 1, max: 10 }
  })
  ageRange: {
    min: number;
    max: number;
  };
}

export class ErrorResponseDto {
  @ApiProperty({ 
    description: 'HTTP status code',
    example: 400
  })
  statusCode: number;

  @ApiProperty({ 
    description: 'Error message',
    example: 'Bad Request'
  })
  message: string;

  @ApiProperty({ 
    description: 'Error details',
    example: 'Validation failed'
  })
  error: string;

  @ApiProperty({ 
    description: 'Timestamp of the error',
    example: '2023-12-01T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({ 
    description: 'Request path where error occurred',
    example: '/cats/paginated'
  })
  path: string;
}

export class CountResponseDto {
  @ApiProperty({ 
    description: 'Total number of cats',
    example: 25,
    minimum: 0
  })
  total: number;

  @ApiProperty({ 
    description: 'Timestamp when count was retrieved',
    example: '2023-12-01T10:30:00.000Z'
  })
  timestamp: string;
}

export class ModuleRefResponseDto {
  @ApiProperty({ 
    description: 'Array of cats retrieved via ModuleRef',
    type: [CatDto]
  })
  cats: CatDto[];

  @ApiProperty({ 
    description: 'Source of the data',
    example: 'ModuleRef'
  })
  source: string;
}

export class ProviderInfoResponseDto {
  @ApiProperty({ 
    description: 'Type of module',
    example: 'CatsModule'
  })
  moduleType: string;

  @ApiProperty({ 
    description: 'Available providers in the module',
    example: ['CatsService', 'CatsModuleRefService']
  })
  providers: string[];

  @ApiProperty({ 
    description: 'Imported modules',
    example: ['CommonModule']
  })
  imports: string[];
}