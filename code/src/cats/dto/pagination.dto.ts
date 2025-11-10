import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Skip must be an integer' })
  @Min(0, { message: 'Skip must be at least 0' })
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  page?: number;

  /**
   * Get the calculated skip value based on page and limit
   */
  getSkip(): number {
    if (this.page && this.page > 0) {
      return (this.page - 1) * this.getLimit();
    }
    return this.skip || 0;
  }

  /**
   * Get the limit value (with default)
   */
  getLimit(): number {
    return this.limit || 10;
  }

  /**
   * Get the current page number
   */
  getCurrentPage(): number {
    if (this.page && this.page > 0) {
      return this.page;
    }
    return Math.floor(this.getSkip() / this.getLimit()) + 1;
  }

  /**
   * Validate that either page or skip is used, not both
   */
  validate(): void {
    if (this.page && this.skip && this.skip > 0) {
      throw new Error('Cannot use both page and skip parameters. Use either page or skip.');
    }
  }
}