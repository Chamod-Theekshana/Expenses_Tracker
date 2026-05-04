import { normalizeTag, parseTagInput, mergeTags } from '../src/utils/tags';

describe('tags utils', () => {
  it('normalizeTag strips hash and lowercases', () => {
    expect(normalizeTag('#Food')).toBe('food');
  });

  it('parseTagInput dedupes', () => {
    expect(parseTagInput('a, b, a')).toEqual(['a', 'b']);
  });

  it('mergeTags preserves order and uniqueness', () => {
    expect(mergeTags(['x'], ['y', 'x'])).toEqual(['x', 'y']);
  });
});
