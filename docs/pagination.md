# NestJS Pagination Implementation Guide

This document provides a comprehensive guide to the pagination system implemented in the Cats module, featuring DTOs with query parameter validation and detailed response metadata.

## 📋 **Overview**

Our pagination system provides:
- **Flexible Input**: Support for both `page`/`limit` and `skip`/`limit` patterns
- **Comprehensive Metadata**: Total count, current page, next/previous pages, and more
- **Navigation Links**: Automatic URL generation for pagination navigation
- **Type Safety**: Full TypeScript support with validation
- **Multiple Endpoints**: Various pagination patterns and use cases

## 🔧 **Core Components**

### 1. PaginationDto
Located: `src/cats/dto/pagination.dto.ts`

```typescript
class PaginationDto {
  limit?: number = 10;     // Items per page (1-100)
  skip?: number = 0;       // Number of items to skip
  page?: number;           // Page number (1-based)
}
```

**Validation Rules:**
- `limit`: 1-100, defaults to 10
- `skip`: ≥0, defaults to 0  
- `page`: ≥1, alternative to skip
- Cannot use both `page` and `skip` simultaneously

### 2. PaginationMeta Interface
Located: `src/cats/interfaces/pagination.interface.ts`

```typescript
interface PaginationMeta {
  total: number;           // Total items available
  limit: number;           // Items per page
  skip: number;           // Items skipped
  currentPage: number;    // Current page (1-based)
  totalPages: number;     // Total pages available
  hasNextPage: boolean;   // Whether next page exists
  hasPreviousPage: boolean; // Whether previous page exists
  nextPage: number | null;    // Next page number
  previousPage: number | null; // Previous page number
  itemCount: number;      // Items on current page
  startIndex: number;     // First item index (0-based)
  endIndex: number;       // Last item index (0-based)
}
```

### 3. PaginatedResponse Interface
```typescript
interface PaginatedResponse<T> {
  data: T[];              // Actual data items
  meta: PaginationMeta;   // Pagination metadata
  links?: PaginationLinks; // Navigation URLs
}
```

## 🚀 **API Endpoints**

### Basic Pagination
```http
GET /cats/paginated?limit=5&page=2
GET /cats/paginated?limit=5&skip=10
```

**Response Example:**
```json
{
  "data": [
    { "name": "Whiskers", "age": 2 },
    { "name": "Luna", "age": 3 }
  ],
  "meta": {
    "total": 15,
    "limit": 5,
    "skip": 10,
    "currentPage": 3,
    "totalPages": 3,
    "hasNextPage": false,
    "hasPreviousPage": true,
    "nextPage": null,
    "previousPage": 2,
    "itemCount": 2,
    "startIndex": 10,
    "endIndex": 11
  },
  "links": {
    "first": "http://localhost:3000/cats/paginated?page=1&limit=5",
    "previous": "http://localhost:3000/cats/paginated?page=2&limit=5",
    "current": "http://localhost:3000/cats/paginated?page=3&limit=5",
    "last": "http://localhost:3000/cats/paginated?page=3&limit=5"
  }
}
```

### Search with Pagination
```http
GET /cats/search?q=whiskers&limit=3&page=1
```

### Age Range with Pagination
```http
GET /cats/age-range?minAge=2&maxAge=5&limit=4&page=1
```

### Sorted Results with Pagination
```http
GET /cats/sorted?sortBy=name&sortOrder=asc&limit=3&page=1
GET /cats/sorted?sortBy=age&sortOrder=desc&limit=3&page=1
```

### Advanced Examples
```http
# Large dataset with navigation
GET /cats/pagination-examples/basic?limit=2&page=1

# Page vs Skip comparison
GET /cats/pagination-examples/comparison?page=2&skip=4&limit=3

# Custom validation
GET /cats/pagination-examples/custom-validation?page=1&limit=5

# Metadata only (no data transfer)
GET /cats/pagination-examples/metadata-only?limit=10&page=1
```

## 💡 **Usage Patterns**

### 1. Page-Based Pagination (Most Common)
```typescript
// Client request
GET /cats/paginated?page=3&limit=10

// What happens internally:
const paginationDto = new PaginationDto();
paginationDto.page = 3;
paginationDto.limit = 10;
// Automatically calculates: skip = (3-1) * 10 = 20
```

### 2. Offset-Based Pagination (For Advanced Use)
```typescript
// Client request  
GET /cats/paginated?skip=20&limit=10

// Direct skip usage:
const paginationDto = new PaginationDto();
paginationDto.skip = 20;
paginationDto.limit = 10;
// Automatically calculates: page = Math.floor(20/10) + 1 = 3
```

### 3. Search with Pagination
```typescript
// Service method
searchCats(searchTerm: string, paginationDto: PaginationDto): PaginatedResponse<Cat> {
  const filteredCats = this.cats.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const limit = paginationDto.getLimit();
  const skip = paginationDto.getSkip();
  const paginatedCats = filteredCats.slice(skip, skip + limit);
  
  return PaginationHelper.createResponse(
    paginatedCats,
    filteredCats.length, // Total after filtering
    limit,
    skip,
    baseUrl,
    { search: searchTerm } // Include search term in links
  );
}
```

## 🔍 **Frontend Integration Examples**

### React Hook Example
```typescript
const usePaginatedCats = (page: number, limit: number = 10) => {
  const [data, setData] = useState<PaginatedResponse<Cat> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/cats/paginated?page=${page}&limit=${limit}`
        );
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch cats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
  }, [page, limit]);

  return { data, loading };
};

// Usage in component
const CatsList = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const { data, loading } = usePaginatedCats(currentPage, 5);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      <div className="cats-list">
        {data.data.map(cat => (
          <div key={cat.name}>{cat.name} - {cat.age} years old</div>
        ))}
      </div>
      
      <div className="pagination">
        <button 
          disabled={!data.meta.hasPreviousPage}
          onClick={() => setCurrentPage(data.meta.previousPage!)}
        >
          Previous
        </button>
        
        <span>
          Page {data.meta.currentPage} of {data.meta.totalPages}
        </span>
        
        <button 
          disabled={!data.meta.hasNextPage}
          onClick={() => setCurrentPage(data.meta.nextPage!)}
        >
          Next
        </button>
      </div>
      
      <div className="info">
        Showing {data.meta.itemCount} of {data.meta.total} cats
      </div>
    </div>
  );
};
```

### Vue.js Example
```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <div class="cats-grid">
        <div v-for="cat in cats.data" :key="cat.name" class="cat-card">
          {{ cat.name }} ({{ cat.age }} years)
        </div>
      </div>
      
      <nav class="pagination">
        <button 
          :disabled="!cats.meta.hasPreviousPage"
          @click="goToPage(cats.meta.previousPage)"
        >
          ← Previous
        </button>
        
        <span class="page-info">
          {{ cats.meta.currentPage }} / {{ cats.meta.totalPages }}
        </span>
        
        <button 
          :disabled="!cats.meta.hasNextPage"
          @click="goToPage(cats.meta.nextPage)"
        >
          Next →
        </button>
      </nav>
      
      <div class="summary">
        Items {{ cats.meta.startIndex + 1 }}-{{ cats.meta.endIndex + 1 }} 
        of {{ cats.meta.total }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const cats = ref(null);
const loading = ref(false);
const currentPage = ref(1);
const limit = ref(6);

const fetchCats = async () => {
  loading.value = true;
  try {
    const response = await fetch(
      `/cats/paginated?page=${currentPage.value}&limit=${limit.value}`
    );
    cats.value = await response.json();
  } catch (error) {
    console.error('Error fetching cats:', error);
  } finally {
    loading.value = false;
  }
};

const goToPage = (page) => {
  if (page) currentPage.value = page;
};

onMounted(fetchCats);
watch([currentPage, limit], fetchCats);
</script>
```

## ⚡ **Performance Considerations**

### 1. Large Datasets
```typescript
// For very large datasets, consider cursor-based pagination
interface CursorPaginationDto {
  limit: number;
  cursor?: string; // Last item ID or timestamp
  direction?: 'forward' | 'backward';
}

// More efficient for large datasets
getCatsAfterCursor(cursor: string, limit: number) {
  // Implementation depends on your data store
  // This avoids OFFSET which can be slow on large datasets
}
```

### 2. Database Integration
```typescript
// Example with TypeORM
async getPaginatedCatsFromDB(paginationDto: PaginationDto) {
  const limit = paginationDto.getLimit();
  const skip = paginationDto.getSkip();
  
  const [cats, total] = await this.catRepository.findAndCount({
    skip,
    take: limit,
    order: { name: 'ASC' }
  });
  
  return PaginationHelper.createResponse(cats, total, limit, skip);
}
```

### 3. Caching Strategies
```typescript
// Cache total counts for better performance
@Injectable()
export class CachedPaginationService {
  private totalCountCache = new Map<string, { count: number; expiry: number }>();
  
  async getCachedTotal(cacheKey: string): Promise<number | null> {
    const cached = this.totalCountCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.count;
    }
    return null;
  }
  
  setCachedTotal(cacheKey: string, count: number, ttlMs: number = 300000) {
    this.totalCountCache.set(cacheKey, {
      count,
      expiry: Date.now() + ttlMs
    });
  }
}
```

## 🧪 **Testing**

### Unit Test Example
```typescript
describe('PaginationDto', () => {
  it('should calculate skip from page and limit', () => {
    const dto = new PaginationDto();
    dto.page = 3;
    dto.limit = 10;
    
    expect(dto.getSkip()).toBe(20);
    expect(dto.getCurrentPage()).toBe(3);
  });

  it('should validate that page and skip cannot be used together', () => {
    const dto = new PaginationDto();
    dto.page = 2;
    dto.skip = 10;
    
    expect(() => dto.validate()).toThrow();
  });
});

describe('CatsService Pagination', () => {
  it('should return paginated cats with correct metadata', async () => {
    const paginationDto = new PaginationDto();
    paginationDto.page = 2;
    paginationDto.limit = 5;
    
    const result = service.getPaginatedCats(paginationDto);
    
    expect(result.data).toHaveLength(5);
    expect(result.meta.currentPage).toBe(2);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.skip).toBe(5);
  });
});
```

### Integration Test Example
```typescript
describe('Cats Pagination (e2e)', () => {
  it('/cats/paginated (GET) should return paginated response', async () => {
    const response = await request(app.getHttpServer())
      .get('/cats/paginated?page=1&limit=3')
      .expect(200);

    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.data).toHaveLength(3);
    expect(response.body.meta.currentPage).toBe(1);
    expect(response.body.meta.limit).toBe(3);
  });

  it('should handle invalid pagination parameters', async () => {
    await request(app.getHttpServer())
      .get('/cats/paginated?page=0&limit=200')
      .expect(400);
  });
});
```

## 🔒 **Security & Validation**

### Input Validation
```typescript
// The PaginationDto automatically validates:
// - limit: 1-100 (prevents memory issues)
// - skip: ≥0 (prevents negative offsets)  
// - page: ≥1 (prevents invalid pages)

// Custom validation can be added:
@IsOptional()
@Max(50, { message: 'Limit too high for this endpoint' })
limit?: number;
```

### Rate Limiting
```typescript
// Consider adding rate limiting for pagination endpoints
@Get('paginated')
@Throttle(100, 60) // 100 requests per minute
getPaginatedCats(@Query() paginationDto: PaginationDto) {
  return this.catsService.getPaginatedCats(paginationDto);
}
```

## 📊 **Best Practices**

1. **Always provide defaults** for limit and skip/page
2. **Validate upper bounds** to prevent memory issues
3. **Include total count** in metadata for UI components
4. **Generate navigation links** for easier frontend integration
5. **Cache total counts** when possible for performance
6. **Use consistent response format** across all paginated endpoints
7. **Consider cursor-based pagination** for very large datasets
8. **Test edge cases** like empty results, single page, etc.

## 🔄 **Migration from Simple Arrays**

### Before (Simple Array)
```typescript
@Get()
getAllCats() {
  return this.catsService.getCats(); // Returns Cat[]
}
```

### After (Paginated)
```typescript
@Get()
getAllCats(@Query() paginationDto: PaginationDto) {
  return this.catsService.getPaginatedCats(paginationDto); // Returns PaginatedResponse<Cat>
}
```

This implementation provides a robust, type-safe, and user-friendly pagination system that can be easily extended and integrated into any NestJS application!