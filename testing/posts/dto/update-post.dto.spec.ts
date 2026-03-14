import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdatePostDto } from '../../../src/posts/dto/update-post.dto';

async function validateUpdate(plain: Record<string, any>) {
  const dto = plainToInstance(UpdatePostDto, plain);
  const errors = await validate(dto);
  return { dto, errors };
}

describe('UpdatePostDto', () => {
  describe('valid inputs', () => {
    it('should pass with empty object (all fields optional)', async () => {
      const { errors } = await validateUpdate({});
      expect(errors).toHaveLength(0);
    });

    it('should pass with only title', async () => {
      const { errors } = await validateUpdate({ title: 'Updated Title' });
      expect(errors).toHaveLength(0);
    });

    it('should pass with only body', async () => {
      const { errors } = await validateUpdate({ body: 'Updated body long enough' });
      expect(errors).toHaveLength(0);
    });

    it('should pass with only author', async () => {
      const { errors } = await validateUpdate({ author: 'New Author' });
      expect(errors).toHaveLength(0);
    });

    it('should pass with all fields provided', async () => {
      const { errors } = await validateUpdate({
        title: 'Updated Title',
        body: 'Updated body content long enough',
        author: 'Updated Author',
      });
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid inputs', () => {
    it('should fail when title provided but too short', async () => {
      const { errors } = await validateUpdate({ title: 'AB' });
      expect(errors.some((e) => e.property === 'title')).toBe(true);
    });

    it('should fail when body provided but too short', async () => {
      const { errors } = await validateUpdate({ body: 'Short' });
      expect(errors.some((e) => e.property === 'body')).toBe(true);
    });

    it('should fail when author provided but empty', async () => {
      const { errors } = await validateUpdate({ author: '' });
      expect(errors.some((e) => e.property === 'author')).toBe(true);
    });
  });
});
