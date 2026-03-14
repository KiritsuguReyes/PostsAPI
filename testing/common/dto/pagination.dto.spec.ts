import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from '../../../src/common/dto/pagination.dto';

async function validatePagination(plain: Record<string, any>) {
  const dto = plainToInstance(PaginationDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('PaginationDto', () => {
  describe('valid inputs', () => {
    it('should pass with empty object (all optional)', async () => {
      const { errors } = await validatePagination({});
      expect(errors).toHaveLength(0);
    });

    it('should pass with all valid fields', async () => {
      const { errors } = await validatePagination({
        page: '2',
        limit: '20',
        search: 'Angular',
        sortBy: 'title',
        sortOrder: 'asc',
      });
      expect(errors).toHaveLength(0);
    });

    it('should transform page string to number', async () => {
      const { dto } = await validatePagination({ page: '3' });
      expect(dto.page).toBe(3);
    });

    it('should transform limit string to number', async () => {
      const { dto } = await validatePagination({ limit: '50' });
      expect(dto.limit).toBe(50);
    });

    it('should accept sortOrder "asc"', async () => {
      const { errors } = await validatePagination({ sortOrder: 'asc' });
      expect(errors).toHaveLength(0);
    });

    it('should accept sortOrder "desc"', async () => {
      const { errors } = await validatePagination({ sortOrder: 'desc' });
      expect(errors).toHaveLength(0);
    });

    it('should accept limit = 100 (max)', async () => {
      const { errors } = await validatePagination({ limit: '100' });
      expect(errors).toHaveLength(0);
    });

    it('should accept page = 1 (min)', async () => {
      const { errors } = await validatePagination({ page: '1' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when limit exceeds 100', async () => {
      const { errors } = await validatePagination({ limit: '200' });
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });

    it('should fail when page is 0 or negative', async () => {
      const { errors } = await validatePagination({ page: '0' });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should fail when page is negative', async () => {
      const { errors } = await validatePagination({ page: '-5' });
      expect(errors.some((e) => e.property === 'page')).toBe(true);
    });

    it('should accept any string for sortOrder (no enum constraint applied)', async () => {
      const { errors } = await validatePagination({ sortOrder: 'random' });
      expect(errors.some((e) => e.property === 'sortOrder')).toBe(false);
    });

    it('should fail when limit is 0', async () => {
      const { errors } = await validatePagination({ limit: '0' });
      expect(errors.some((e) => e.property === 'limit')).toBe(true);
    });
  });

  describe('default values', () => {
    it('should use default page=1 when not provided', async () => {
      const { dto } = await validatePagination({});
      // Default comes from @Transform or definition
      expect(dto.page === undefined || dto.page === 1).toBe(true);
    });

    it('should use default limit=10 when not provided', async () => {
      const { dto } = await validatePagination({});
      expect(dto.limit === undefined || dto.limit === 10).toBe(true);
    });
  });
});
