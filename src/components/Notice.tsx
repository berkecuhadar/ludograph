import { useEffect } from 'react';
import { useUiStore } from '../store/uiStore';
import './Notice.css';

const SHOW_MS = 6000;

export function Notice() {
  const notice = useUiStore((s) => s.notice);
  const clear = useUiStore((s) => s.clearNotice);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clear, SHOW_MS);
    return () => clearTimeout(timer);
  }, [notice, clear]);

  if (!notice) return null;
  return (
    <div className="notice" role="status">
      <span>{notice.text}</span>
      <button type="button" aria-label="Dismiss" onClick={clear}>
        x
      </button>
    </div>
  );
}
