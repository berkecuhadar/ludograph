import { useMemo } from 'react';
import { strings } from '../lib/strings';
import { useProjectStore } from '../store/projectStore';
import { paletteGroups } from './paletteGroups';
import { useAddNode } from './useAddNode';
import './Palette.css';

export function Palette() {
  const customKinds = useProjectStore((s) => s.project.customKinds);
  const groups = useMemo(() => paletteGroups(customKinds), [customKinds]);
  const add = useAddNode();

  return (
    <nav className="palette" aria-label={strings.palette.title}>
      <h2 className="palette-title">{strings.palette.title}</h2>
      {groups.map((group) => (
        <section key={group.id} className="palette-group">
          <h3>{group.label}</h3>
          <ul>
            {group.entries.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => add(entry)}>
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
