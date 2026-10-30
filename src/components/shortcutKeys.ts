export type ShortcutAction =
  | 'quickAdd'
  | 'help'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'selectAll'
  | 'openInside'
  | 'goUp'
  | 'search';

type KeyInfo = Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>;

export function matchShortcut(e: KeyInfo): ShortcutAction | null {
  if (e.altKey) return e.key === 'ArrowUp' ? 'goUp' : null;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (!mod) {
    // Backquote is the physical key left of 1, whatever character the layout puts on it.
    if (e.key === '?' || e.code === 'Backquote') return 'help';
    if (key === 'n' && !e.shiftKey) return 'quickAdd';
    if (e.key === 'Enter') return 'openInside';
    if (e.key === '/') return 'search';
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
    case 'k':
      return 'search';
    default:
      return null;
  }
}

// True when the key press is meant for a text field, so we leave it alone.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

// Enter is also how you press a button, so only treat it as a shortcut on the canvas.
export function isCanvasTarget(target: EventTarget | null): boolean {
  if (target === document.body) return true;
  return target instanceof HTMLElement && target.closest('.react-flow') !== null;
}
