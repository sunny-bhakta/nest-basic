export interface PaginationMeta {
  /**
   * Total number of items
   */
  total: number;

  /**
   * Number of items per page
   */
  limit: number;

  /**
   * Number of items skipped
   */
  skip: number;

  /**
   * Current page number (1-based)
   */
  currentPage: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Whether there is a next page
   */
  hasNextPage: boolean;

  /**
   * Whether there is a previous page
   */
  hasPreviousPage: boolean;

  /**
   * Next page number (null if no next page)
   */
  nextPage: number | null;

  /**
   * Previous page number (null if no previous page)
   */
  previousPage: number | null;

  /**
   * Number of items on current page
   */
  itemCount: number;

  /**
   * Index of first item on current page (0-based)
   */
  startIndex: number;

  /**
   * Index of last item on current page (0-based)
   */
  endIndex: number;
}

export interface PaginatedResponse<T> {
  /**
   * The actual data items
   */
  data: T[];

  /**
   * Pagination metadata
   */
  meta: PaginationMeta;

  /**
   * Links for navigation (optional)
   */
  links?: PaginationLinks;
}

export interface PaginationLinks {
  /**
   * Link to first page
   */
  first?: string;

  /**
   * Link to previous page
   */
  previous?: string;

  /**
   * Link to current page
   */
  current?: string;

  /**
   * Link to next page
   */
  next?: string;

  /**
   * Link to last page
   */
  last?: string;
}

export class PaginationHelper {
  /**
   * Create pagination metadata
   */
  static createMeta(
    total: number,
    limit: number,
    skip: number,
    itemCount: number,
  ): PaginationMeta {
    const currentPage = Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
      total,
      limit,
      skip,
      currentPage,
      totalPages,
      hasNextPage,
      hasPreviousPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      previousPage: hasPreviousPage ? currentPage - 1 : null,
      itemCount,
      startIndex: skip,
      endIndex: skip + itemCount - 1,
    };
  }

  /**
   * Create navigation links
   */
  static createLinks(
    baseUrl: string,
    meta: PaginationMeta,
    queryParams?: Record<string, any>,
  ): PaginationLinks {
    const createUrl = (page: number) => {
      const params = new URLSearchParams();
      if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (key !== 'page' && key !== 'skip' && value !== undefined) {
            params.append(key, String(value));
          }
        });
      }
      params.append('page', String(page));
      params.append('limit', String(meta.limit));
      return `${baseUrl}?${params.toString()}`;
    };

    const links: PaginationLinks = {
      current: createUrl(meta.currentPage),
    };

    if (meta.totalPages > 0) {
      links.first = createUrl(1);
      links.last = createUrl(meta.totalPages);
    }

    if (meta.hasPreviousPage) {
      links.previous = createUrl(meta.previousPage!);
    }

    if (meta.hasNextPage) {
      links.next = createUrl(meta.nextPage!);
    }

    return links;
  }

  /**
   * Create a complete paginated response
   */
  static createResponse<T>(
    data: T[],
    total: number,
    limit: number,
    skip: number,
    baseUrl?: string,
    queryParams?: Record<string, any>,
  ): PaginatedResponse<T> {
    const meta = this.createMeta(total, limit, skip, data.length);
    
    const response: PaginatedResponse<T> = {
      data,
      meta,
    };

    if (baseUrl) {
      response.links = this.createLinks(baseUrl, meta, queryParams);
    }

    return response;
  }
}