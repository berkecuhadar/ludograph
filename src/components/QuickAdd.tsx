import { useMemo, useState, type KeyboardEvent } from 'react';
import { strings } from '../lib/strings';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Modal } from './Modal';
import { filterEntries, paletteGroups, type PaletteEntry } from './paletteGroups';
import { useAddNode } from './useAddNode';
import './QuickAdd.css';

function QuickAddBody({ onDone }: { onDone: () => void }) {
  const customKinds = useProjectStore((s) => s.project.customKinds);
  const add = useAddNode();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const groups = useMemo(() => paletteGroups(customKinds), [customKinds]);
  const results = useMemo(() => filterEntries(groups, query), [groups, query]);

  const choose = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    add(entry);
    onDone();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <div className="modal-body quickadd">
      <h2>{strings.quickAdd.title}</h2>
      <input
        autoFocus
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="quickadd-list"
        aria-activedescendant={results[active] ? `quickadd-${results[active].id}` : undefined}
        placeholder={strings.quickAdd.placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ul id="quickadd-list" role="listbox" className="quickadd-list">
        {results.map((entry, i) => (
          <li
            key={entry.id}
            id={`quickadd-${entry.id}`}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(entry)}
          >
            {entry.label}
          </li>
        ))}
        {results.length === 0 && <li className="quickadd-empty">{strings.quickAdd.empty}</li>}
      </ul>
    </div>
  );
}

export function QuickAdd() {
  const open = useUiStore((s) => s.dialog === 'quickAdd');
  const setDialog = useUiStore((s) => s.setDialog);
  const close = () => setDialog(null);

  return (
    <Modal open={open} title={strings.quickAdd.title} onClose={close}>
      <QuickAddBody onDone={close} />
    </Modal>
  );
}
