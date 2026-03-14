import { CommentSchema } from '../../../src/comments/schemas/comment.schema';

describe('CommentSchema', () => {
  it('should have postId field', () => {
    const path = CommentSchema.path('postId');
    expect(path).toBeDefined();
  });

  it('should have name field', () => {
    const path = CommentSchema.path('name');
    expect(path).toBeDefined();
  });

  it('should have email field', () => {
    const path = CommentSchema.path('email');
    expect(path).toBeDefined();
  });

  it('should have body field', () => {
    const path = CommentSchema.path('body');
    expect(path).toBeDefined();
  });

  it('should require postId', () => {
    const path = CommentSchema.path('postId') as any;
    expect(path.isRequired).toBeTruthy();
  });

  it('should require name', () => {
    const path = CommentSchema.path('name') as any;
    expect(path.isRequired).toBeTruthy();
  });

  it('should require body', () => {
    const path = CommentSchema.path('body') as any;
    expect(path.isRequired).toBeTruthy();
  });

  it('should have a text index on name and body', () => {
    const indexes = CommentSchema.indexes();
    const hasTextIndex = indexes.some(([fields]) => {
      return Object.values(fields).some((v) => v === 'text');
    });
    expect(hasTextIndex).toBe(true);
  });
});
