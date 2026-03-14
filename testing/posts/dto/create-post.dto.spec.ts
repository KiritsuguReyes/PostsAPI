import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePostDto } from '../../../src/posts/dto/create-post.dto';

async function validatePost(plain: Record<string, any>) {
  const dto = plainToInstance(CreatePostDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('CreatePostDto', () => {
  describe('valid inputs', () => {
    it('should pass with all valid fields', async () => {
      const { errors } = await validatePost({
        title: 'Valid Title',
        body: 'This is a valid body long enough',
        author: 'Author Name',
      });
      expect(errors).toHaveLength(0);
    });

    it('should pass with title of exactly 3 characters', async () => {
      const { errors } = await validatePost({
        title: 'ABC',
        body: 'This is a valid body long enough',
        author: 'Author Name',
      });
      expect(errors).toHaveLength(0);
    });

    it('should pass with body of exactly 10 characters', async () => {
      const { errors } = await validatePost({
        title: 'Valid Title',
        body: '1234567890',
        author: 'Author Name',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when title is missing', async () => {
      const { errors } = await validatePost({
        body: 'Valid body content',
        author: 'Author',
      });
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('should fail when title is too short (< 3 chars)', async () => {
      const { errors } = await validatePost({
        title: 'AB',
        body: 'Valid body content long enough',
        author: 'Author',
      });
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('should fail when body is missing', async () => {
      const { errors } = await validatePost({
        title: 'Valid Title',
        author: 'Author',
      });
      expect(errors.some((e) => e.property === 'body')).toBe(true);
    });

    it('should fail when body is too short (< 10 chars)', async () => {
      const { errors } = await validatePost({
        title: 'Valid Title',
        body: 'Short',
        author: 'Author',
      });
      expect(errors.some((e) => e.property === 'body')).toBe(true);
    });

    it('should fail when author is missing', async () => {
      const { errors } = await validatePost({
        title: 'Valid Title',
        body: 'Valid body content long enough',
      });
      expect(errors.some((e) => e.property === 'author')).toBe(true);
    });

    it('should fail when author is empty string', async () => {
      const { errors } = await validatePost({
        title: 'Valid Title',
        body: 'Valid body content long enough',
        author: '',
      });
      expect(errors.some((e) => e.property === 'author')).toBe(true);
    });

    it('should fail when title is not a string', async () => {
      const { errors } = await validatePost({
        title: 12345,
        body: 'Valid body content long enough',
        author: 'Author',
      });
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('should fail when all fields are empty', async () => {
      const { errors } = await validatePost({});
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
