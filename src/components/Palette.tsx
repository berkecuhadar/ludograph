import { useReactFlow } from '@xyflow/react';
import { useMemo } from 'react';
import { strings } from '../lib/strings';
import { useProjectStore } from '../store/projectStore';
import { paletteGroups, type PaletteEntry } from './paletteGroups';
import './Palette.css';

export function Palette() {
  const customKinds = useProjectStore((s) => s.project.customKinds);
  const addNode = useProjectStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();
  const groups = useMemo(() => paletteGroups(customKinds), [customKinds]);

  const add = (entry: PaletteEntry) => {
    // Drop the node near the middle of the visible canvas, nudged so repeated adds don't stack.
    const area = document.querySelector('.canvas')?.getBoundingClientRect();
    const count =
      useProjectStore.getState().project.graphs[useProjectStore.getState().activeGraphId]?.nodes
        .length ?? 0;
    const nudge = (count % 8) * 24;
    const center = area
      ? { x: area.left + area.width / 2, y: area.top + area.height / 2 }
      : { x: 400, y: 300 };
    const position = screenToFlowPosition({ x: center.x + nudge, y: center.y + nudge });
    addNode(entry.kind, position, entry.overrides);
  };

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
