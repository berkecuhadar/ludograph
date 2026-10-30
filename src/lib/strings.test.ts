import { describe, expect, it } from 'vitest';
import { strings } from './strings';

describe('strings', () => {
  it('exposes the app name', () => {
    expect(strings.app.name).toBe('Ludograph');
  });
});
