# Multi-Field Sorting Documentation

This document covers the advanced multi-field sorting capabilities added to the pagination system, allowing complex sorting operations across multiple fields with different sort orders.

## 📋 **Overview**

Multi-field sorting enables you to sort data by multiple criteria in priority order. For example, you can sort cats by age (descending) first, and then by name (ascending) for cats with the same age.

## 🔧 **Core Components**

### 1. MultiSortDto
Located: `src/cats/dto/multi-sort.dto.ts`

```typescript
class MultiSortDto {
  sort?: SortFieldDto[] = [new SortFieldDto()];
}

class SortFieldDto {
  field: CatSortField;  // 'name' | 'age'
  order: SortOrder;     // 'asc' | 'desc'
}
```

### 2. Supported Fields
```typescript
enum CatSortField {
  NAME = 'name',
  AGE = 'age',
}

enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
```

## 🚀 **API Endpoints**

### Basic Multi-Field Sorting
```http
# Simple multi-sort
GET /cats/multi-sorted?sort=name:asc&page=1&limit=5

# Multiple fields
GET /cats/multi-sorted?sort=age:desc&sort=name:asc&page=1&limit=5

# Comma-separated format
GET /cats/multi-sorted?sort=age:desc,name:asc&page=1&limit=5
```

### Advanced Multi-Sort Endpoints
```http
# Search with multi-sort
GET /cats/pagination-examples/multi-sort-search?q=whiskers&sort=age:desc&sort=name:asc

# Age range with multi-sort
GET /cats/pagination-examples/multi-sort-age-range?minAge=2&maxAge=5&sort=age:asc&sort=name:desc

# Complex multi-sort with separate parameters
GET /cats/pagination-examples/complex-multi-sort?primarySort=age:desc&secondarySort=name:asc

# Sort comparison
GET /cats/pagination-examples/sort-comparison?sort1=name:asc&sort2=age:desc,name:asc
```

### Utility Endpoints
```http
# Get sorting examples and help
GET /cats/pagination-examples/sort-examples

# Get field statistics
GET /cats/pagination-examples/sort-statistics

# Get unique values for a field
GET /cats/pagination-examples/field-values?field=age

# Get sorting help
GET /cats/sort-help
```

## 💡 **Query Parameter Formats**

### 1. Multiple Query Parameters (Recommended)
```http
GET /cats/multi-sorted?sort=age:desc&sort=name:asc&limit=5
```
**Pros:** Clear, URL-friendly, easy to build dynamically
**Use case:** Most frontend applications

### 2. Comma-Separated Values
```http
GET /cats/multi-sorted?sort=age:desc,name:asc&limit=5
```
**Pros:** Compact, single parameter
**Use case:** Simple integrations, manual testing

### 3. Array Format
```http
GET /cats/multi-sorted?sort[]=age:desc&sort[]=name:asc&limit=5
```
**Pros:** Explicit array notation
**Use case:** Systems that prefer array notation

### 4. Named Parameters (Complex Endpoint)
```http
GET /cats/pagination-examples/complex-multi-sort?primarySort=age:desc&secondarySort=name:asc
```
**Pros:** Self-documenting, explicit priority
**Use case:** UI builders, configuration systems

## 📊 **Response Format**

**Request:**
```http
GET /cats/multi-sorted?sort=age:desc&sort=name:asc&page=1&limit=3
```

**Response:**
```json
{
  "data": [
    { "name": "Luna", "age": 3 },
    { "name": "Shadow", "age": 1 },
    { "name": "Whiskers", "age": 2 }
  ],
  "meta": {
    "total": 15,
    "limit": 3,
    "skip": 0,
    "currentPage": 1,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextPage": 2,
    "previousPage": null,
    "itemCount": 3,
    "startIndex": 0,
    "endIndex": 2
  },
  "links": {
    "first": "http://localhost:3000/cats/multi-sorted?page=1&limit=3&sort=age:desc,name:asc",
    "current": "http://localhost:3000/cats/multi-sorted?page=1&limit=3&sort=age:desc,name:asc",
    "next": "http://localhost:3000/cats/multi-sorted?page=2&limit=3&sort=age:desc,name:asc",
    "last": "http://localhost:3000/cats/multi-sorted?page=5&limit=3&sort=age:desc,name:asc"
  }
}
```

## 🔍 **Frontend Integration**

### React Hook for Multi-Sort
```typescript
interface SortField {
  field: string;
  order: 'asc' | 'desc';
}

const useMultiSortCats = (sortFields: SortField[], page: number = 1, limit: number = 10) => {
  const [data, setData] = useState<PaginatedResponse<Cat> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      setLoading(true);
      try {
        // Build sort query parameters
        const sortParams = sortFields
          .map(sf => `sort=${sf.field}:${sf.order}`)
          .join('&');
        
        const url = `/cats/multi-sorted?${sortParams}&page=${page}&limit=${limit}`;
        const response = await fetch(url);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch cats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
  }, [sortFields, page, limit]);

  return { data, loading };
};

// Usage in component
const MultiSortCatsList = () => {
  const [sortFields, setSortFields] = useState<SortField[]>([
    { field: 'age', order: 'desc' },
    { field: 'name', order: 'asc' }
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const { data, loading } = useMultiSortCats(sortFields, currentPage, 5);

  const addSortField = (field: string, order: 'asc' | 'desc') => {
    setSortFields([...sortFields, { field, order }]);
  };

  const removeSortField = (index: number) => {
    setSortFields(sortFields.filter((_, i) => i !== index));
  };

  const updateSortField = (index: number, field: string, order: 'asc' | 'desc') => {
    const newFields = [...sortFields];
    newFields[index] = { field, order };
    setSortFields(newFields);
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;

  return (
    <div>
      {/* Sort Controls */}
      <div className="sort-controls">
        <h3>Sort Criteria (Priority Order)</h3>
        {sortFields.map((sortField, index) => (
          <div key={index} className="sort-field">
            <span>#{index + 1}</span>
            <select 
              value={sortField.field}
              onChange={(e) => updateSortField(index, e.target.value, sortField.order)}
            >
              <option value="name">Name</option>
              <option value="age">Age</option>
            </select>
            <select 
              value={sortField.order}
              onChange={(e) => updateSortField(index, sortField.field, e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button onClick={() => removeSortField(index)}>Remove</button>
          </div>
        ))}
        <button onClick={() => addSortField('name', 'asc')}>Add Sort Field</button>
      </div>

      {/* Results */}
      <div className="results">
        <h3>Results</h3>
        <div className="cats-list">
          {data.data.map((cat, index) => (
            <div key={index} className="cat-item">
              {cat.name} - {cat.age} years old
            </div>
          ))}
        </div>
        
        {/* Pagination */}
        <div className="pagination">
          <button 
            disabled={!data.meta.hasPreviousPage}
            onClick={() => setCurrentPage(data.meta.previousPage!)}
          >
            Previous
          </button>
          <span>Page {data.meta.currentPage} of {data.meta.totalPages}</span>
          <button 
            disabled={!data.meta.hasNextPage}
            onClick={() => setCurrentPage(data.meta.nextPage!)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Vue.js Multi-Sort Component
```vue
<template>
  <div class="multi-sort-cats">
    <!-- Sort Builder -->
    <div class="sort-builder">
      <h3>Sort Criteria</h3>
      <div v-for="(sortField, index) in sortFields" :key="index" class="sort-row">
        <span class="priority">{{ index + 1 }}.</span>
        <select v-model="sortField.field" @change="updateSort">
          <option value="name">Name</option>
          <option value="age">Age</option>
        </select>
        <select v-model="sortField.order" @change="updateSort">
          <option value="asc">↑ Ascending</option>
          <option value="desc">↓ Descending</option>
        </select>
        <button @click="removeSortField(index)" :disabled="sortFields.length === 1">
          ✕
        </button>
      </div>
      <button @click="addSortField" class="add-sort">+ Add Sort</button>
    </div>

    <!-- Results -->
    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="cats" class="results">
      <div class="cats-grid">
        <div v-for="cat in cats.data" :key="`${cat.name}-${cat.age}`" class="cat-card">
          <h4>{{ cat.name }}</h4>
          <p>{{ cat.age }} years old</p>
        </div>
      </div>
      
      <nav class="pagination">
        <button 
          :disabled="!cats.meta.hasPreviousPage"
          @click="goToPage(cats.meta.previousPage)"
        >
          ← Previous
        </button>
        <span>{{ cats.meta.currentPage }} / {{ cats.meta.totalPages }}</span>
        <button 
          :disabled="!cats.meta.hasNextPage"
          @click="goToPage(cats.meta.nextPage)"
        >
          Next →
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';

const cats = ref(null);
const loading = ref(false);
const currentPage = ref(1);
const limit = ref(5);

const sortFields = reactive([
  { field: 'age', order: 'desc' },
  { field: 'name', order: 'asc' }
]);

const fetchCats = async () => {
  loading.value = true;
  try {
    const sortParams = sortFields
      .map(sf => `sort=${sf.field}:${sf.order}`)
      .join('&');
    
    const url = `/cats/multi-sorted?${sortParams}&page=${currentPage.value}&limit=${limit.value}`;
    const response = await fetch(url);
    cats.value = await response.json();
  } catch (error) {
    console.error('Error fetching cats:', error);
  } finally {
    loading.value = false;
  }
};

const addSortField = () => {
  sortFields.push({ field: 'name', order: 'asc' });
  updateSort();
};

const removeSortField = (index) => {
  if (sortFields.length > 1) {
    sortFields.splice(index, 1);
    updateSort();
  }
};

const updateSort = () => {
  currentPage.value = 1; // Reset to first page
  fetchCats();
};

const goToPage = (page) => {
  if (page) {
    currentPage.value = page;
    fetchCats();
  }
};

onMounted(fetchCats);
watch([currentPage, limit], fetchCats);
</script>

<style scoped>
.sort-builder {
  background: #f5f5f5;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.sort-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.priority {
  font-weight: bold;
  min-width: 20px;
}

.cats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.cat-card {
  border: 1px solid #ddd;
  padding: 1rem;
  border-radius: 8px;
  background: white;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
</style>
```

## 🧪 **Testing Examples**

### Unit Tests
```typescript
describe('MultiSortDto', () => {
  it('should parse sort string correctly', () => {
    const sortField = MultiSortDto.parseSortString('name:asc');
    expect(sortField.field).toBe(CatSortField.NAME);
    expect(sortField.order).toBe(SortOrder.ASC);
  });

  it('should handle multiple sort fields', () => {
    const dto = new MultiSortDto();
    dto.sort = MultiSortDto.fromQueryParams(['age:desc', 'name:asc']);
    
    expect(dto.getAllSortFields()).toHaveLength(2);
    expect(dto.isSortingBy(CatSortField.AGE)).toBe(true);
    expect(dto.getSortOrderFor(CatSortField.AGE)).toBe(SortOrder.DESC);
  });
});

describe('CatsService Multi-Sort', () => {
  it('should sort by multiple fields correctly', () => {
    const multiSort = new MultiSortDto();
    multiSort.sort = [
      new SortFieldDto(CatSortField.AGE, SortOrder.DESC),
      new SortFieldDto(CatSortField.NAME, SortOrder.ASC)
    ];
    
    const paginationDto = new PaginationDto();
    paginationDto.page = 1;
    paginationDto.limit = 10;
    
    const result = service.getMultiSortedCats(multiSort, paginationDto);
    
    // Verify sort order
    for (let i = 1; i < result.data.length; i++) {
      const prev = result.data[i - 1];
      const curr = result.data[i];
      
      if (prev.age === curr.age) {
        // If ages are equal, names should be in ascending order
        expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
      } else {
        // Ages should be in descending order
        expect(prev.age).toBeGreaterThanOrEqual(curr.age);
      }
    }
  });
});
```

### Integration Tests
```typescript
describe('Multi-Sort Endpoints (e2e)', () => {
  it('should handle multi-field sorting', async () => {
    const response = await request(app.getHttpServer())
      .get('/cats/multi-sorted?sort=age:desc&sort=name:asc&page=1&limit=5')
      .expect(200);

    expect(response.body.data).toHaveLength(5);
    expect(response.body.meta.currentPage).toBe(1);
    
    // Verify sorting
    const cats = response.body.data;
    for (let i = 1; i < cats.length; i++) {
      const prev = cats[i - 1];
      const curr = cats[i];
      
      if (prev.age === curr.age) {
        expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
      } else {
        expect(prev.age).toBeGreaterThanOrEqual(curr.age);
      }
    }
  });

  it('should handle comma-separated sort parameters', async () => {
    const response = await request(app.getHttpServer())
      .get('/cats/multi-sorted?sort=age:desc,name:asc&page=1&limit=3')
      .expect(200);

    expect(response.body.data).toHaveLength(3);
    expect(response.body.links.current).toContain('sort=age:desc,name:asc');
  });
});
```

## 📈 **Performance Considerations**

### 1. Sorting Algorithm
The multi-field comparator uses a priority-based approach:
```typescript
private multiFieldComparator(a: Cat, b: Cat, sortFields: SortFieldDto[]): number {
  for (const sortField of sortFields) {
    let comparison = 0;
    
    switch (sortField.field) {
      case CatSortField.NAME:
        comparison = a.name.localeCompare(b.name);
        break;
      case CatSortField.AGE:
        comparison = a.age - b.age;
        break;
    }
    
    if (sortField.order === SortOrder.DESC) {
      comparison = -comparison;
    }
    
    if (comparison !== 0) {
      return comparison; // First difference determines order
    }
  }
  return 0; // All fields are equal
}
```

### 2. Database Integration
```typescript
// Example with TypeORM
async getMultiSortedCatsFromDB(multiSort: MultiSortDto, pagination: PaginationDto) {
  const queryBuilder = this.catRepository.createQueryBuilder('cat');
  
  // Apply sorting
  multiSort.getAllSortFields().forEach((sortField, index) => {
    const orderMethod = index === 0 ? 'orderBy' : 'addOrderBy';
    queryBuilder[orderMethod](`cat.${sortField.field}`, sortField.order.toUpperCase());
  });
  
  // Apply pagination
  queryBuilder
    .skip(pagination.getSkip())
    .take(pagination.getLimit());
  
  const [cats, total] = await queryBuilder.getManyAndCount();
  
  return PaginationHelper.createResponse(cats, total, pagination.getLimit(), pagination.getSkip());
}
```

### 3. Caching Strategies
```typescript
// Cache sorted results for common sort combinations
const sortCacheKey = `cats_sorted_${multiSort.toQueryString()}_${pagination.getSkip()}_${pagination.getLimit()}`;
const cached = await this.cacheService.get(sortCacheKey);
if (cached) {
  return cached;
}

const result = this.getMultiSortedCats(multiSort, pagination);
await this.cacheService.set(sortCacheKey, result, 300); // 5 minutes TTL
return result;
```

## 🔒 **Best Practices**

1. **Limit Sort Fields**: Prevent too many sort criteria to avoid performance issues
2. **Validate Field Names**: Ensure only allowed fields can be sorted
3. **Default Sorting**: Always provide sensible defaults
4. **URL Length**: Be mindful of URL length limits with many sort parameters
5. **Index Database Fields**: Ensure database fields used for sorting are indexed
6. **Cache Common Sorts**: Cache frequently used sort combinations
7. **Stable Sorting**: Ensure consistent results for identical sort criteria

## 🎯 **Common Use Cases**

### 1. Directory Listings
```http
GET /cats/multi-sorted?sort=name:asc&page=1&limit=20
```

### 2. Age-Priority Listings
```http
GET /cats/multi-sorted?sort=age:desc&sort=name:asc&page=1&limit=10
```

### 3. Search Results
```http
GET /cats/pagination-examples/multi-sort-search?q=cat&sort=age:desc&sort=name:asc
```

### 4. Filtered Lists
```http
GET /cats/pagination-examples/multi-sort-age-range?minAge=2&maxAge=5&sort=age:asc&sort=name:desc
```

This multi-field sorting system provides powerful, flexible sorting capabilities while maintaining performance and ease of use! 🚀