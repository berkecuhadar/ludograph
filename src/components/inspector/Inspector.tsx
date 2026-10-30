import { strings } from '../../lib/strings';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { EdgeInspector } from './EdgeInspector';
import { NodeInspector } from './NodeInspector';
import './Inspector.css';

export function Inspector() {
  const graph = useProjectStore((s) => s.project.graphs[s.activeGraphId]);
  const selectedNodeIds = useUiStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useUiStore((s) => s.selectedEdgeIds);
  const t = strings.inspector;

  const node =
    selectedNodeIds.length === 1
      ? graph?.nodes.find((n) => n.id === selectedNodeIds[0])
      : undefined;
  const edge =
    !node && selectedNodeIds.length === 0 && selectedEdgeIds.length === 1
      ? graph?.edges.find((e) => e.id === selectedEdgeIds[0])
      : undefined;

  // The keys reset local editing state when another item is picked.
  let body;
  if (node) body = <NodeInspector key={node.id} node={node} />;
  else if (edge) body = <EdgeInspector key={edge.id} edge={edge} />;
  else {
    const count = selectedNodeIds.length;
    body = <p className="muted">{count > 1 ? t.multiple(count) : t.empty}</p>;
  }

  return (
    <div className="inspector" aria-label={t.title}>
      {body}
    </div>
  );
}
