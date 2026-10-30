export type ShortcutAction =
  'quickAdd' | 'help' | 'undo' | 'redo' | 'copy' | 'paste' | 'duplicate' | 'selectAll';

type KeyInfo = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

export function matchShortcut(e: KeyInfo): ShortcutAction | null {
  if (e.altKey) return null;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (!mod) {
    // Backquote is the physical key left of 1, whatever character the layout puts on it.
    if (e.key === '?' || e.code === 'Backquote') return 'help';
    if (key === 'n' && !e.shiftKey) return 'quickAdd';
    return null;
  }

  switch (key) {
    case 'z':
      return e.shiftKey ? 'redo' : 'undo';
    case 'y':
      return 'redo';
    case 'c':
      return 'copy';
    case 'v':
      return 'paste';
    case 'd':
      return 'duplicate';
    case 'a':
      return 'selectAll';
    default:
      return null;
  }
}

// True when the key press is meant for a text field, so we leave it alone.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
