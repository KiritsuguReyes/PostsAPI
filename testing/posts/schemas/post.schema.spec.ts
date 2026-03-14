import { PostSchema } from '../../../src/posts/schemas/post.schema';
import { SchemaType } from 'mongoose';

describe('PostSchema', () => {
  it('should have title field', () => {
    const path = PostSchema.path('title');
    expect(path).toBeDefined();
  });

  it('should have body field', () => {
    const path = PostSchema.path('body');
    expect(path).toBeDefined();
  });

  it('should have author field', () => {
    const path = PostSchema.path('author');
    expect(path).toBeDefined();
  });

  it('should require title', () => {
    const path = PostSchema.path('title') as any;
    expect(path.isRequired).toBeTruthy();
  });

  it('should require body', () => {
    const path = PostSchema.path('body') as any;
    expect(path.isRequired).toBeTruthy();
  });

  it('should require author', () => {
    const path = PostSchema.path('author') as any;
    expect(path.isRequired).toBeTruthy();
  });

  it('should have a text index on title and body', () => {
    const indexes = PostSchema.indexes();
    const hasTextIndex = indexes.some(([fields]) => {
      return Object.values(fields).some((v) => v === 'text');
    });
    expect(hasTextIndex).toBe(true);
  });
});
