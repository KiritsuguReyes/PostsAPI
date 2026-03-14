import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from '../../../src/users/dto/create-user.dto';

async function validateUser(plain: Record<string, any>) {
  const dto = plainToInstance(CreateUserDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('CreateUserDto', () => {
  const validPayload = {
    email: 'user@example.com',
    name: 'Test User',
    password: 'password123',
  };

  describe('valid inputs', () => {
    it('should pass with all valid fields', async () => {
      const { errors } = await validateUser(validPayload);
      expect(errors).toHaveLength(0);
    });

    it('should pass with name of exactly 2 characters', async () => {
      const { errors } = await validateUser({ ...validPayload, name: 'AB' });
      expect(errors).toHaveLength(0);
    });

    it('should pass with password of exactly 6 characters', async () => {
      const { errors } = await validateUser({ ...validPayload, password: '123456' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when email is missing', async () => {
      const { errors } = await validateUser({ ...validPayload, email: undefined });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail when email is not a valid email', async () => {
      const { errors } = await validateUser({ ...validPayload, email: 'notanemail' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail when name is missing', async () => {
      const { errors } = await validateUser({ ...validPayload, name: undefined });
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should fail when name is too short (< 2 chars)', async () => {
      const { errors } = await validateUser({ ...validPayload, name: 'A' });
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should fail when password is missing', async () => {
      const { errors } = await validateUser({ ...validPayload, password: undefined });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail when password is too short (< 6 chars)', async () => {
      const { errors } = await validateUser({ ...validPayload, password: '12345' });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail with all fields missing', async () => {
      const { errors } = await validateUser({});
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
