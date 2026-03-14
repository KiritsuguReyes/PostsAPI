import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from '../../../src/auth/dto/login.dto';

async function validateLogin(plain: Record<string, any>) {
  const dto = plainToInstance(LoginDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('LoginDto', () => {
  const validPayload = {
    email: 'user@example.com',
    password: 'password123',
  };

  describe('valid inputs', () => {
    it('should pass with valid email and password', async () => {
      const { errors } = await validateLogin(validPayload);
      expect(errors).toHaveLength(0);
    });

    it('should pass with any non-empty password string', async () => {
      const { errors } = await validateLogin({ ...validPayload, password: 'x' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when email is missing', async () => {
      const { errors } = await validateLogin({ password: 'password123' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail when email is not a valid email', async () => {
      const { errors } = await validateLogin({ ...validPayload, email: 'notanemail' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail when email is empty string', async () => {
      const { errors } = await validateLogin({ ...validPayload, email: '' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail when password is missing', async () => {
      const { errors } = await validateLogin({ email: 'user@example.com' });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail when password is empty string', async () => {
      const { errors } = await validateLogin({ ...validPayload, password: '' });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail when both fields are missing', async () => {
      const { errors } = await validateLogin({});
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when password is not a string (number)', async () => {
      const { errors } = await validateLogin({ ...validPayload, password: 12345 });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });
  });
});
