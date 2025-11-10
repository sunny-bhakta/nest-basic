import { Injectable, Inject, BadRequestException, Logger } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { PaginationDto } from './dto/pagination.dto';
import { MultiSortDto, SortFieldDto, CatSortField, SortOrder } from './dto/multi-sort.dto';
import type { CatsModuleOptions } from './interfaces/cats-module-options.interface';
import { PaginatedResponse, PaginationHelper } from './interfaces/pagination.interface';
import { CATS_MODULE_OPTIONS } from './cats.constants';

export interface Cat {
  name: string;
  age: number;
}

@Injectable()
export class CatsService {
  private cats: Cat[] = [];
  private readonly logger = new Logger(CatsService.name);
  private readonly maxCats: number;
  private readonly enableLogging: boolean;
  private readonly storageType: string;

  constructor(
    @Inject(CATS_MODULE_OPTIONS) private readonly options: CatsModuleOptions,
  ) {
    // Initialize configuration
    this.maxCats = options.maxCats || 100;
    this.enableLogging = options.enableLogging ?? true;
    this.storageType = options.storageType || 'memory';

    // Initialize with default cats if provided
    if (options.defaultCats && options.defaultCats.length > 0) {
      this.cats = [...options.defaultCats];
      this.log(`Initialized with ${this.cats.length} default cats`);
    } else {
      // Default fallback cats
      this.cats = [{ name: 'Tom', age: 3 }];
      this.log('Initialized with default fallback cat');
    }

    this.log(`CatsService initialized with storage type: ${this.storageType}`);
  }

  getCats(): Cat[] {
    this.log(`Retrieved ${this.cats.length} cats`);
    return this.cats;
  }

  createCat(cat: CreateCatDto): Cat {
    // Check max cats limit
    if (this.cats.length >= this.maxCats) {
      throw new BadRequestException(
        `Cannot add more cats. Maximum limit of ${this.maxCats} reached.`,
      );
    }

    // Simulate different storage behaviors
    switch (this.storageType) {
      case 'file':
        this.log(`Saving cat ${cat.name} to file storage`);
        break;
      case 'database':
        this.log(`Saving cat ${cat.name} to database`);
        break;
      case 'memory':
      default:
        this.log(`Saving cat ${cat.name} to memory storage`);
        break;
    }

    this.cats.push(cat);
    this.log(`Created new cat: ${cat.name}, age: ${cat.age}`);
    return cat;
  }

  deleteCat(name: string): boolean {
    const initialLength = this.cats.length;
    this.cats = this.cats.filter(cat => cat.name !== name);
    const deleted = this.cats.length < initialLength;
    
    if (deleted) {
      this.log(`Deleted cat: ${name}`);
    } else {
      this.log(`Cat not found for deletion: ${name}`);
    }
    
    return deleted;
  }

  updateCat(name: string, updateData: Partial<CreateCatDto>): Cat | null {
    const catIndex = this.cats.findIndex(cat => cat.name === name);
    
    if (catIndex === -1) {
      this.log(`Cat not found for update: ${name}`);
      return null;
    }

    this.cats[catIndex] = { ...this.cats[catIndex], ...updateData };
    this.log(`Updated cat: ${name}`);
    return this.cats[catIndex];
  }

  getCatByName(name: string): Cat | undefined {
    const cat = this.cats.find(cat => cat.name === name);
    this.log(`Search for cat: ${name}, found: ${!!cat}`);
    return cat;
  }

  getStorageInfo(): { type: string; count: number; maxCats: number } {
    return {
      type: this.storageType,
      count: this.cats.length,
      maxCats: this.maxCats,
    };
  }

  /**
   * Get paginated cats with comprehensive pagination metadata
   */
  getPaginatedCats(
    paginationDto: PaginationDto,
    baseUrl?: string,
  ): PaginatedResponse<Cat> {
    // Validate pagination parameters
    paginationDto.validate();

    const limit = paginationDto.getLimit();
    const skip = paginationDto.getSkip();
    const total = this.cats.length;

    // Get the slice of data
    const paginatedCats = this.cats.slice(skip, skip + limit);

    this.log(`Paginated cats: skip=${skip}, limit=${limit}, total=${total}, returned=${paginatedCats.length}`);

    // Create paginated response with metadata
    return PaginationHelper.createResponse(
      paginatedCats,
      total,
      limit,
      skip,
      baseUrl,
      {
        // Add any additional query parameters here if needed
      },
    );
  }

  /**
   * Search cats with pagination
   */
  searchCats(
    searchTerm: string,
    paginationDto: PaginationDto,
    baseUrl?: string,
  ): PaginatedResponse<Cat> {
    paginationDto.validate();

    // Filter cats based on search term
    const filteredCats = this.cats.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.age.toString().includes(searchTerm)
    );

    const limit = paginationDto.getLimit();
    const skip = paginationDto.getSkip();
    const total = filteredCats.length;

    // Get the slice of filtered data
    const paginatedCats = filteredCats.slice(skip, skip + limit);

    this.log(`Search cats: term="${searchTerm}", total=${total}, returned=${paginatedCats.length}`);

    return PaginationHelper.createResponse(
      paginatedCats,
      total,
      limit,
      skip,
      baseUrl,
      { search: searchTerm },
    );
  }

  /**
   * Get cats by age range with pagination
   */
  getCatsByAgeRange(
    minAge: number,
    maxAge: number,
    paginationDto: PaginationDto,
    baseUrl?: string,
  ): PaginatedResponse<Cat> {
    paginationDto.validate();

    // Filter cats by age range
    const filteredCats = this.cats.filter(cat => 
      cat.age >= minAge && cat.age <= maxAge
    );

    const limit = paginationDto.getLimit();
    const skip = paginationDto.getSkip();
    const total = filteredCats.length;

    const paginatedCats = filteredCats.slice(skip, skip + limit);

    this.log(`Age range cats: ${minAge}-${maxAge}, total=${total}, returned=${paginatedCats.length}`);

    return PaginationHelper.createResponse(
      paginatedCats,
      total,
      limit,
      skip,
      baseUrl,
      { minAge, maxAge },
    );
  }

  /**
   * Get total count of cats (useful for pagination calculations)
   */
  getTotalCount(): number {
    return this.cats.length;
  }

  /**
   * Get cats with custom sorting and pagination
   */
  getSortedCats(
    sortBy: 'name' | 'age' = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    paginationDto: PaginationDto,
    baseUrl?: string,
  ): PaginatedResponse<Cat> {
    paginationDto.validate();

    // Sort cats
    const sortedCats = [...this.cats].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'age') {
        comparison = a.age - b.age;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    const limit = paginationDto.getLimit();
    const skip = paginationDto.getSkip();
    const total = sortedCats.length;

    const paginatedCats = sortedCats.slice(skip, skip + limit);

    this.log(`Sorted cats: sortBy=${sortBy}, order=${sortOrder}, total=${total}, returned=${paginatedCats.length}`);

    return PaginationHelper.createResponse(
      paginatedCats,
      total,
      limit,
      skip,
      baseUrl,
      { sortBy, sortOrder },
    );
  }

  /**
   * Get cats with multi-field sorting and pagination
   */
  getMultiSortedCats(
    multiSortDto: MultiSortDto,
    paginationDto: PaginationDto,
    baseUrl?: string,
  ): PaginatedResponse<Cat> {
    paginationDto.validate();

    const sortFields = multiSortDto.getAllSortFields();
    
    // Sort cats using multi-field comparator
    const sortedCats = [...this.cats].sort((a, b) => {
      return this.multiFieldComparator(a, b, sortFields);
    });

    const limit = paginationDto.getLimit();
    const skip = paginationDto.getSkip();
    const total = sortedCats.length;

    const paginatedCats = sortedCats.slice(skip, skip + limit);

    this.log(`Multi-sorted cats: fields=[${sortFields.map(sf => `${sf.field}:${sf.order}`).join(', ')}], total=${total}, returned=${paginatedCats.length}`);

    return PaginationHelper.createResponse(
      paginatedCats,
      total,
      limit,
      skip,
      baseUrl,
      { sort: multiSortDto.toQueryString() },
    );
  }

  /**
   * Search cats with multi-field sorting and pagination
   */
  searchCatsWithMultiSort(
    searchTerm: string,
    multiSortDto: MultiSortDto,
    paginationDto: PaginationDto,
    baseUrl?: string,
  ): PaginatedResponse<Cat> {
    paginationDto.validate();

    // Filter cats based on search term
    const filteredCats = this.cats.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.age.toString().includes(searchTerm)
    );

    // Sort filtered results
    const sortFields = multiSortDto.getAllSortFields();
    const sortedCats = filteredCats.sort((a, b) => {
      return this.multiFieldComparator(a, b, sortFields);
    });

    const limit = paginationDto.getLimit();
    const skip = paginationDto.getSkip();
    const total = sortedCats.length;

    const paginatedCats = sortedCats.slice(skip, skip + limit);

    this.log(`Search with multi-sort: term="${searchTerm}", fields=[${sortFields.map(sf => `${sf.field}:${sf.order}`).join(', ')}], total=${total}, returned=${paginatedCats.length}`);

    return PaginationHelper.createResponse(
      paginatedCats,
      total,
      limit,
      skip,
      baseUrl,
      { search: searchTerm, sort: multiSortDto.toQueryString() },
    );
  }

  /**
   * Get cats by age range with multi-field sorting and pagination
   */
  getCatsByAgeRangeWithMultiSort(
    minAge: number,
    maxAge: number,
    multiSortDto: MultiSortDto,
    paginationDto: PaginationDto,
    baseUrl?: string,
  ): PaginatedResponse<Cat> {
    paginationDto.validate();

    // Filter cats by age range
    const filteredCats = this.cats.filter(cat => 
      cat.age >= minAge && cat.age <= maxAge
    );

    // Sort filtered results
    const sortFields = multiSortDto.getAllSortFields();
    const sortedCats = filteredCats.sort((a, b) => {
      return this.multiFieldComparator(a, b, sortFields);
    });

    const limit = paginationDto.getLimit();
    const skip = paginationDto.getSkip();
    const total = sortedCats.length;

    const paginatedCats = sortedCats.slice(skip, skip + limit);

    this.log(`Age range with multi-sort: ${minAge}-${maxAge}, fields=[${sortFields.map(sf => `${sf.field}:${sf.order}`).join(', ')}], total=${total}, returned=${paginatedCats.length}`);

    return PaginationHelper.createResponse(
      paginatedCats,
      total,
      limit,
      skip,
      baseUrl,
      { minAge, maxAge, sort: multiSortDto.toQueryString() },
    );
  }

  /**
   * Multi-field comparator function
   */
  private multiFieldComparator(a: Cat, b: Cat, sortFields: SortFieldDto[]): number {
    for (const sortField of sortFields) {
      let comparison = 0;

      // Compare based on field type
      switch (sortField.field) {
        case CatSortField.NAME:
          comparison = a.name.localeCompare(b.name);
          break;
        case CatSortField.AGE:
          comparison = a.age - b.age;
          break;
        // Add more fields as needed
        default:
          continue;
      }

      // Apply sort order
      if (sortField.order === SortOrder.DESC) {
        comparison = -comparison;
      }

      // If not equal, return this comparison
      if (comparison !== 0) {
        return comparison;
      }

      // If equal, continue to next sort field
    }

    // All fields are equal
    return 0;
  }

  /**
   * Get unique values for a specific field (useful for UI filters)
   */
  getUniqueFieldValues(field: CatSortField): any[] {
    switch (field) {
      case CatSortField.NAME:
        return [...new Set(this.cats.map(cat => cat.name))].sort();
      case CatSortField.AGE:
        return [...new Set(this.cats.map(cat => cat.age))].sort((a, b) => a - b);
      default:
        return [];
    }
  }

  /**
   * Get sorting statistics
   */
  getSortingStats(): { field: CatSortField; uniqueValues: number; sampleValues: any[] }[] {
    return Object.values(CatSortField).map(field => ({
      field,
      uniqueValues: this.getUniqueFieldValues(field).length,
      sampleValues: this.getUniqueFieldValues(field).slice(0, 5),
    }));
  }

  private log(message: string): void {
    if (this.enableLogging) {
      this.logger.log(message);
    }
  }
}