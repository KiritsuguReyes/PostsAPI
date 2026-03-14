import { ApiResponse } from '../../../src/common/responses/api-response';

describe('ApiResponse', () => {
  describe('constructor', () => {
    it('should create instance with all fields', () => {
      const response = new ApiResponse(true, 'OK', { id: 1 });

      expect(response.success).toBe(true);
      expect(response.message).toBe('OK');
      expect(response.data).toEqual({ id: 1 });
      expect(response.timestamp).toBeDefined();
    });

    it('should set timestamp to a valid ISO string', () => {
      const before = Date.now();
      const response = new ApiResponse(true, 'OK');
      const after = Date.now();
      const ts = new Date(response.timestamp).getTime();

      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });

    it('should allow error field to be set', () => {
      const response = new ApiResponse(false, 'Error', null, { statusCode: 500 });

      expect(response.success).toBe(false);
      expect(response.error).toEqual({ statusCode: 500 });
    });
  });

  describe('static success()', () => {
    it('should return success=true with data and default message', () => {
      const data = { id: 1, name: 'Post' };
      const result = ApiResponse.success(data);

      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.message).toBe('Operación exitosa');
    });

    it('should use custom message when provided', () => {
      const result = ApiResponse.success({ id: 1 }, 'Post creado');

      expect(result.message).toBe('Post creado');
    });

    it('should set error to undefined', () => {
      const result = ApiResponse.success({ id: 1 });

      expect(result.error).toBeUndefined();
    });

    it('should work with array data', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = ApiResponse.success(data);

      expect(result.data).toEqual(data);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should work with null data', () => {
      const result = ApiResponse.success(null);

      expect(result.data).toBeNull();
      expect(result.success).toBe(true);
    });

    it('should always include a timestamp', () => {
      const result = ApiResponse.success({ id: 1 });

      expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('static error()', () => {
    it('should return success=false with message and statusCode', () => {
      const result = ApiResponse.error('Not found', 404);

      expect(result).toBeInstanceOf(ApiResponse);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Not found');
      expect(result.error).toMatchObject({ statusCode: 404 });
    });

    it('should set data to null', () => {
      const result = ApiResponse.error('Error', 500);

      expect(result.data).toBeNull();
    });

    it('should include details when provided', () => {
      const details = ['field is required', 'email is invalid'];
      const result = ApiResponse.error('Validation error', 400, details);

      expect(result.error.details).toEqual(details);
    });

    it('should work without statusCode and details', () => {
      const result = ApiResponse.error('Generic error');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Generic error');
    });

    it('should always include a timestamp', () => {
      const result = ApiResponse.error('Error', 500);

      expect(result.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
