import { describe, expect, it } from 'vitest';
import { matchShortcut } from './shortcutKeys';

const press = (key: string, mods: Partial<Parameters<typeof matchShortcut>[0]> = {}) =>
  matchShortcut({
    key,
    code: '',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...mods,
  });

describe('matchShortcut', () => {
  it('opens quick add on N and help on ?', () => {
    expect(press('n')).toBe('quickAdd');
    expect(press('N', { shiftKey: true })).toBeNull();
    expect(press('?', { shiftKey: true })).toBe('help');
  });

  it('opens help on the key left of 1, whatever character it types', () => {
    expect(press('"', { code: 'Backquote' })).toBe('help');
    expect(press('`', { code: 'Backquote' })).toBe('help');
    expect(press('"', { code: 'Backquote', ctrlKey: true })).toBeNull();
  });

  it('maps undo and both redo forms', () => {
    expect(press('z', { ctrlKey: true })).toBe('undo');
    expect(press('Z', { ctrlKey: true, shiftKey: true })).toBe('redo');
    expect(press('y', { ctrlKey: true })).toBe('redo');
  });

  it('accepts Cmd as well as Ctrl', () => {
    expect(press('c', { metaKey: true })).toBe('copy');
    expect(press('v', { metaKey: true })).toBe('paste');
  });

  it('maps duplicate and select all', () => {
    expect(press('d', { ctrlKey: true })).toBe('duplicate');
    expect(press('a', { ctrlKey: true })).toBe('selectAll');
  });

  it('ignores unrelated keys and Alt combinations', () => {
    expect(press('x')).toBeNull();
    expect(press('x', { ctrlKey: true })).toBeNull();
    expect(press('z', { ctrlKey: true, altKey: true })).toBeNull();
  });
});
