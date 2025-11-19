import { PaginationHelper, PaginationMeta, PaginatedResponse, PaginationLinks } from './pagination.interface';

describe('PaginationHelper', () => {
  describe('createMeta', () => {
    it('should create correct meta for first page', () => {
      const meta = PaginationHelper.createMeta(100, 10, 0, 10);
      expect(meta).toEqual({
        total: 100,
        limit: 10,
        skip: 0,
        currentPage: 1,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false,
        nextPage: 2,
        previousPage: null,
        itemCount: 10,
        startIndex: 0,
        endIndex: 9,
      });
    });

    it('should create correct meta for middle page', () => {
      const meta = PaginationHelper.createMeta(50, 10, 20, 10);
      expect(meta.currentPage).toBe(3);
      expect(meta.totalPages).toBe(5);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPreviousPage).toBe(true);
      expect(meta.nextPage).toBe(4);
      expect(meta.previousPage).toBe(2);
      expect(meta.startIndex).toBe(20);
      expect(meta.endIndex).toBe(29);
    });

    it('should create correct meta for last page', () => {
      const meta = PaginationHelper.createMeta(25, 10, 20, 5);
      expect(meta.currentPage).toBe(3);
      expect(meta.totalPages).toBe(3);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(true);
      expect(meta.nextPage).toBeNull();
      expect(meta.previousPage).toBe(2);
      expect(meta.itemCount).toBe(5);
      expect(meta.startIndex).toBe(20);
      expect(meta.endIndex).toBe(24);
    });

    it('should handle zero items', () => {
      const meta = PaginationHelper.createMeta(0, 10, 0, 0);
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPreviousPage).toBe(false);
      expect(meta.nextPage).toBeNull();
      expect(meta.previousPage).toBeNull();
    });
  });

  describe('createLinks', () => {
    const baseUrl = 'http://localhost/api/cats';

    it('should create correct links for first page', () => {
      const meta = PaginationHelper.createMeta(100, 10, 0, 10);
      const links = PaginationHelper.createLinks(baseUrl, meta, { search: 'cat' });
      expect(links.first).toContain('page=1');
      expect(links.last).toContain('page=10');
      expect(links.current).toContain('page=1');
      expect(links.next).toContain('page=2');
      expect(links.previous).toBeUndefined();
      expect(links.current).toContain('search=cat');
    });

    it('should create correct links for middle page', () => {
      const meta = PaginationHelper.createMeta(100, 10, 30, 10);
      const links = PaginationHelper.createLinks(baseUrl, meta, { type: 'persian' });
      expect(links.first).toContain('page=1');
      expect(links.last).toContain('page=10');
      expect(links.current).toContain('page=4');
      expect(links.next).toContain('page=5');
      expect(links.previous).toContain('page=3');
      expect(links.current).toContain('type=persian');
    });

    it('should create correct links for last page', () => {
      const meta = PaginationHelper.createMeta(25, 10, 20, 5);
      const links = PaginationHelper.createLinks(baseUrl, meta);
      expect(links.first).toContain('page=1');
      expect(links.last).toContain('page=3');
      expect(links.current).toContain('page=3');
      expect(links.next).toBeUndefined();
      expect(links.previous).toContain('page=2');
    });

    it('should handle zero pages', () => {
      const meta = PaginationHelper.createMeta(0, 10, 0, 0);
      const links = PaginationHelper.createLinks(baseUrl, meta);
      expect(links.first).toBeUndefined();
      expect(links.last).toBeUndefined();
      expect(links.next).toBeUndefined();
      expect(links.previous).toBeUndefined();
      expect(links.current).toContain('page=1');
    });
  });

  describe('createResponse', () => {
    it('should create paginated response with links', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = PaginationHelper.createResponse(data, 20, 2, 0, 'http://localhost/api/cats', { q: 'test' });
      expect(response.data).toEqual(data);
      expect(response.meta.total).toBe(20);
      expect(response.links).toBeDefined();
      expect(response.links?.current).toContain('q=test');
    });

    it('should create paginated response without links if baseUrl is not provided', () => {
      const data = [{ id: 1 }];
      const response = PaginationHelper.createResponse(data, 1, 1, 0);
      expect(response.data).toEqual(data);
      expect(response.links).toBeUndefined();
    });
  });
});