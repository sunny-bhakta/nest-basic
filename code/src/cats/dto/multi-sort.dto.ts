import { IsOptional, IsEnum, IsArray, ValidateNested, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum CatSortField {
  NAME = 'name',
  AGE = 'age',
  CREATED_AT = 'createdAt', // For future use
}

export class SortFieldDto {
  @IsEnum(CatSortField, { message: 'Invalid sort field. Use: name, age' })
  field: CatSortField;

  @IsEnum(SortOrder, { message: 'Invalid sort order. Use: asc, desc' })
  order: SortOrder;

  constructor(field?: CatSortField, order?: SortOrder) {
    this.field = field || CatSortField.NAME;
    this.order = order || SortOrder.ASC;
  }
}

export class MultiSortDto {
  @IsOptional()
  @IsArray({ message: 'Sort must be an array of sort criteria' })
  @ValidateNested({ each: true })
  @Type(() => SortFieldDto)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Handle single sort parameter like "name:asc"
      return [MultiSortDto.parseSortString(value)];
    }
    if (Array.isArray(value)) {
      // Handle array of sort parameters like ["name:asc", "age:desc"]
      return value.map(item => 
        typeof item === 'string' ? MultiSortDto.parseSortString(item) : item
      );
    }
    return value;
  })
  sort?: SortFieldDto[] = [new SortFieldDto()];

  /**
   * Parse sort string in format "field:order" or just "field"
   */
  static parseSortString(sortStr: string): SortFieldDto {
    const [field, order] = sortStr.split(':');
    
    // Validate field
    const validField = Object.values(CatSortField).includes(field as CatSortField);
    if (!validField) {
      throw new Error(`Invalid sort field: ${field}. Valid fields: ${Object.values(CatSortField).join(', ')}`);
    }

    // Validate order (default to asc if not provided)
    const sortOrder = order ? order.toLowerCase() as SortOrder : SortOrder.ASC;
    const validOrder = Object.values(SortOrder).includes(sortOrder);
    if (order && !validOrder) {
      throw new Error(`Invalid sort order: ${order}. Valid orders: ${Object.values(SortOrder).join(', ')}`);
    }

    return new SortFieldDto(field as CatSortField, sortOrder);
  }

  /**
   * Convert query parameter formats to SortFieldDto array
   */
  static fromQueryParams(sortParam: string | string[]): SortFieldDto[] {
    if (!sortParam) {
      return [new SortFieldDto()];
    }

    const sortArray = Array.isArray(sortParam) ? sortParam : [sortParam];
    return sortArray.map(item => this.parseSortString(item));
  }

  /**
   * Get the first sort field (for backward compatibility)
   */
  getPrimarySortField(): SortFieldDto {
    return this.sort && this.sort.length > 0 ? this.sort[0] : new SortFieldDto();
  }

  /**
   * Get all sort fields
   */
  getAllSortFields(): SortFieldDto[] {
    return this.sort || [new SortFieldDto()];
  }

  /**
   * Check if sorting by specific field
   */
  isSortingBy(field: CatSortField): boolean {
    return this.getAllSortFields().some(sortField => sortField.field === field);
  }

  /**
   * Get sort order for specific field
   */
  getSortOrderFor(field: CatSortField): SortOrder | null {
    const sortField = this.getAllSortFields().find(sf => sf.field === field);
    return sortField ? sortField.order : null;
  }

  /**
   * Convert to query parameter format
   */
  toQueryString(): string {
    return this.getAllSortFields()
      .map(sf => `${sf.field}:${sf.order}`)
      .join(',');
  }

  /**
   * Create a copy with additional sort field
   */
  addSortField(field: CatSortField, order: SortOrder): MultiSortDto {
    const newSort = new MultiSortDto();
    newSort.sort = [...this.getAllSortFields(), new SortFieldDto(field, order)];
    return newSort;
  }

  /**
   * Remove sort field
   */
  removeSortField(field: CatSortField): MultiSortDto {
    const newSort = new MultiSortDto();
    newSort.sort = this.getAllSortFields().filter(sf => sf.field !== field);
    return newSort;
  }
}