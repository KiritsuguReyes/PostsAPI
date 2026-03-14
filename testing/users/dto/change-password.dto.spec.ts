import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangePasswordDto } from '../../../src/users/dto/change-password.dto';

async function validateChangePassword(plain: Record<string, any>) {
  const dto = plainToInstance(ChangePasswordDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('ChangePasswordDto', () => {
  describe('valid inputs', () => {
    it('should pass with valid password (6+ characters)', async () => {
      const { errors } = await validateChangePassword({
        password: 'validPass123'
      });
      expect(errors).toHaveLength(0);
    });

    it('should pass with exactly 6 characters', async () => {
      const { errors } = await validateChangePassword({
        password: 'pass12'
      });
      expect(errors).toHaveLength(0);
    });

    it('should pass with complex password', async () => {
      const { errors } = await validateChangePassword({
        password: 'ComplexPassword123!@#'
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when password is missing', async () => {
      const { errors } = await validateChangePassword({});
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail when password is empty string', async () => {
      const { errors } = await validateChangePassword({ password: '' });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail when password is too short (less than 6 characters)', async () => {
      const { errors } = await validateChangePassword({ password: '12345' });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail when password is not a string', async () => {
      const { errors } = await validateChangePassword({ password: 123456 });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });

    it('should fail when password is null', async () => {
      const { errors } = await validateChangePassword({ password: null });
      expect(errors.some((e) => e.property === 'password')).toBe(true);
    });
  });
});
