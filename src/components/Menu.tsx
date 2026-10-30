import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import './Menu.css';

export type MenuItem = {
  label: string;
  onSelect: () => void;
  /** Draw a divider above this item. */
  separator?: boolean;
};

type Props = { label: string; items: MenuItem[] };

export function Menu({ label, items }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setOpen(false);
      root.current?.querySelector<HTMLElement>('button')?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const buttons = [...(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? at + 1 : at - 1;
    buttons[(next + buttons.length) % buttons.length]?.focus();
    e.preventDefault();
  };

  return (
    <div className="menu" ref={root} onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              data-separator={item.separator === true}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
