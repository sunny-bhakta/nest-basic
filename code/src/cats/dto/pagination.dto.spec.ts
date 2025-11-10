import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
    it('should use default limit and skip values', () => {
        const dto = new PaginationDto();
        expect(dto.limit).toBe(10);
        expect(dto.skip).toBe(0);
        expect(dto.getLimit()).toBe(10);
        expect(dto.getSkip()).toBe(0);
        expect(dto.getCurrentPage()).toBe(1);
    });

    it('should calculate skip based on page and limit', () => {
        const dto = new PaginationDto();
        dto.page = 3;
        dto.limit = 20;
        expect(dto.getSkip()).toBe(40);
        expect(dto.getCurrentPage()).toBe(3);
    });

    it('should use skip if page is not set', () => {
        const dto = new PaginationDto();
        dto.skip = 15;
        dto.limit = 5;
        expect(dto.getSkip()).toBe(15);
        expect(dto.getCurrentPage()).toBe(4); // (15/5)+1 = 4
    });

    it('should throw error if both page and skip are set', () => {
        const dto = new PaginationDto();
        dto.page = 2;
        dto.skip = 10;
        expect(() => dto.validate()).toThrow('Cannot use both page and skip parameters. Use either page or skip.');
    });

    it('should not throw error if only page is set', () => {
        const dto = new PaginationDto();
        dto.page = 2;
        expect(() => dto.validate()).not.toThrow();
    });

    it('should not throw error if only skip is set', () => {
        const dto = new PaginationDto();
        dto.skip = 10;
        expect(() => dto.validate()).not.toThrow();
    });

    it('should handle page=1 correctly', () => {
        const dto = new PaginationDto();
        dto.page = 1;
        dto.limit = 10;
        expect(dto.getSkip()).toBe(0);
        expect(dto.getCurrentPage()).toBe(1);
    });

    it('should handle limit=undefined and fallback to default', () => {
        const dto = new PaginationDto();
        dto.limit = undefined;
        expect(dto.getLimit()).toBe(10);
    });

    it('should handle skip=undefined and fallback to default', () => {
        const dto = new PaginationDto();
        dto.skip = undefined;
        expect(dto.getSkip()).toBe(0);
    });

    it('should handle page=undefined and fallback to calculated page', () => {
        const dto = new PaginationDto();
        dto.skip = 20;
        dto.limit = 10;
        dto.page = undefined;
        expect(dto.getCurrentPage()).toBe(3);
    });
});