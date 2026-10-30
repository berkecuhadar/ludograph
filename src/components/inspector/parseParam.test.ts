import { describe, expect, it } from 'vitest';
import { parseParamValue } from './parseParam';

describe('parseParamValue', () => {
  it('reads numbers', () => {
    expect(parseParamValue('3')).toBe(3);
    expect(parseParamValue('-2.5')).toBe(-2.5);
    expect(parseParamValue(' 10 ')).toBe(10);
  });

  it('reads booleans', () => {
    expect(parseParamValue('true')).toBe(true);
    expect(parseParamValue('false')).toBe(false);
  });

  it('keeps everything else as text, including half-typed numbers', () => {
    expect(parseParamValue('1.')).toBe('1.');
    expect(parseParamValue('fast')).toBe('fast');
    expect(parseParamValue('')).toBe('');
    expect(parseParamValue('True')).toBe('True');
  });
});
