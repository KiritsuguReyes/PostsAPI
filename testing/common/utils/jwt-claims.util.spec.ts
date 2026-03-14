import { JwtClaimsUtil } from '../../../src/common/utils/jwt-claims.util';

interface MockRequest {
  user?: Record<string, any>;
}

describe('JwtClaimsUtil', () => {
  describe('findFirstValue()', () => {
    it('should return the value of a claim when it exists', () => {
      const req: MockRequest = { user: { sub: 'user123', email: 'user@example.com', role: 'admin' } };

      const result = JwtClaimsUtil.findFirstValue(req as any, 'sub');

      expect(result).toBe('user123');
    });

    it('should return null when claim does not exist', () => {
      const req: MockRequest = { user: { sub: 'user123' } };

      const result = JwtClaimsUtil.findFirstValue(req as any, 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when user is null', () => {
      const req: MockRequest = { user: null };

      const result = JwtClaimsUtil.findFirstValue(req as any, 'sub');

      expect(result).toBeNull();
    });

    it('should return null when user is undefined', () => {
      const req: MockRequest = {};

      const result = JwtClaimsUtil.findFirstValue(req as any, 'sub');

      expect(result).toBeNull();
    });
  });

  describe('getUserId()', () => {
    it('should return userId from payload.sub', () => {
      const req: MockRequest = { user: { sub: 'uid-abc-123' } };

      const result = JwtClaimsUtil.getUserId(req as any);

      expect(result).toBe('uid-abc-123');
    });

    it('should return undefined when no sub claim', () => {
      const req: MockRequest = { user: { email: 'user@example.com' } };

      const result = JwtClaimsUtil.getUserId(req as any);

      expect(result).toBeUndefined();
    });

    it('should return null when user is not authenticated', () => {
      const req: MockRequest = {};

      const result = JwtClaimsUtil.getUserId(req as any);

      expect(result).toBeNull();
    });
  });

  describe('getUserEmail()', () => {
    it('should return email from payload', () => {
      const req: MockRequest = { user: { sub: 'uid', email: 'test@test.com' } };

      const result = JwtClaimsUtil.getUserEmail(req as any);

      expect(result).toBe('test@test.com');
    });

    it('should return null/undefined when no email claim', () => {
      const req: MockRequest = { user: { sub: 'uid' } };

      const result = JwtClaimsUtil.getUserEmail(req as any);

      expect(result).toBeFalsy();
    });
  });

  describe('getUserRole()', () => {
    it('should return role from payload', () => {
      const req: MockRequest = { user: { sub: 'uid', role: 'admin' } };

      const result = JwtClaimsUtil.getUserRole(req as any);

      expect(result).toBe('admin');
    });

    it('should return null/undefined when no role claim', () => {
      const req: MockRequest = { user: { sub: 'uid' } };

      const result = JwtClaimsUtil.getUserRole(req as any);

      expect(result).toBeFalsy();
    });
  });

  describe('getAllClaims()', () => {
    it('should return the full user payload object', () => {
      const payload = { sub: 'uid', email: 'user@example.com', role: 'user', iat: 1234, exp: 5678 };
      const req: MockRequest = { user: payload };

      const result = JwtClaimsUtil.getAllClaims(req as any);

      expect(result).toEqual(payload);
    });

    it('should return null when no user in request', () => {
      const req: MockRequest = {};

      const result = JwtClaimsUtil.getAllClaims(req as any);

      expect(result).toBeNull();
    });
  });
});
