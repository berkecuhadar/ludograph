import { strings } from '../../lib/strings';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { NodeInspector } from './NodeInspector';
import './Inspector.css';

export function Inspector() {
  const nodes = useProjectStore((s) => s.project.graphs[s.activeGraphId]?.nodes);
  const selectedIds = useUiStore((s) => s.selectedNodeIds);
  const t = strings.inspector;

  const selected =
    selectedIds.length === 1 ? nodes?.find((n) => n.id === selectedIds[0]) : undefined;

  return (
    <aside className="inspector" aria-label={t.title}>
      <h2 className="inspector-title">{t.title}</h2>
      {selected ? (
        // The key resets the local editing state when another node is picked.
        <NodeInspector key={selected.id} node={selected} />
      ) : (
        <p className="muted">{selectedIds.length > 1 ? t.multiple(selectedIds.length) : t.empty}</p>
      )}
    </aside>
  );
}
