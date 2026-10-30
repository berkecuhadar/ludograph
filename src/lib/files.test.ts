import { describe, expect, it } from 'vitest';
import { fileSlug } from './files';

describe('fileSlug', () => {
  it('makes a safe file name part', () => {
    expect(fileSlug('My Game!')).toBe('my-game');
    expect(fileSlug('  My  Game: Part 2 ')).toBe('my-game-part-2');
  });

  it('falls back when nothing usable is left', () => {
    expect(fileSlug('???')).toBe('project');
    expect(fileSlug('')).toBe('project');
  });
});
