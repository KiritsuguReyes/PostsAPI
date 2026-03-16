import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCommentDto } from '../../../src/comments/dto/create-comment.dto';

async function validateComment(plain: Record<string, any>) {
  const dto = plainToInstance(CreateCommentDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('CreateCommentDto', () => {
  const validPayload = {
    postId: '507f1f77bcf86cd799439011',
    name: 'Reviewer',
    email: 'reviewer@example.com',
    body: 'Great post content!',
  };

  describe('valid inputs', () => {
    it('should pass with all valid fields', async () => {
      const { errors } = await validateComment(validPayload);
      expect(errors).toHaveLength(0);
    });

    it('should pass with body of exactly 5 characters', async () => {
      const { errors } = await validateComment({ ...validPayload, body: 'Hello' });
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when postId is missing', async () => {
      const { errors } = await validateComment({ ...validPayload, postId: undefined });
      expect(errors.some((e) => e.property === 'postId')).toBe(true);
    });

    it('should fail when postId is not a valid MongoId', async () => {
      const { errors } = await validateComment({ ...validPayload, postId: 'notavalidid' });
      expect(errors.some((e) => e.property === 'postId')).toBe(true);
    });

    it('should pass when name is omitted', async () => {
      const { errors } = await validateComment({ ...validPayload, name: undefined });
      expect(errors.some((e) => e.property === 'name')).toBe(false);
    });

    it('should pass when email is omitted', async () => {
      const { errors } = await validateComment({ ...validPayload, email: undefined });
      expect(errors.some((e) => e.property === 'email')).toBe(false);
    });

    it('should fail when email is invalid format', async () => {
      const { errors } = await validateComment({ ...validPayload, email: 'notanemail' });
      expect(errors.some((e) => e.property === 'email')).toBe(true);
    });

    it('should fail when body is missing', async () => {
      const { errors } = await validateComment({ ...validPayload, body: undefined });
      expect(errors.some((e) => e.property === 'body')).toBe(true);
    });

    it('should fail when body is too short (< 5 chars)', async () => {
      const { errors } = await validateComment({ ...validPayload, body: 'Hi' });
      expect(errors.some((e) => e.property === 'body')).toBe(true);
    });

    it('should fail with all fields missing', async () => {
      const { errors } = await validateComment({});
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
