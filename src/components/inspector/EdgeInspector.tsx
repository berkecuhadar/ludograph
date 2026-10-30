import { strings } from '../../lib/strings';
import { allowedEdgeKinds } from '../../model/edgeRules';
import type { EdgeKind, GameEdge } from '../../model/types';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { Field } from './fields';

export function EdgeInspector({ edge }: { edge: GameEdge }) {
  const t = strings.edgeInspector;
  const project = useProjectStore((s) => s.project);
  const activeGraphId = useProjectStore((s) => s.activeGraphId);
  const updateEdge = useProjectStore((s) => s.updateEdge);
  const setEdgeKind = useProjectStore((s) => s.setEdgeKind);
  const removeEdges = useProjectStore((s) => s.removeEdges);
  const notify = useUiStore((s) => s.notify);

  const graph = project.graphs[activeGraphId];
  const from = graph?.nodes.find((n) => n.id === edge.source);
  const to = graph?.nodes.find((n) => n.id === edge.target);

  // The current kind is always listed, plus every other kind the rules allow for this pair.
  const others =
    from && to
      ? allowedEdgeKinds(
          from,
          to,
          project.customKinds,
          (graph?.edges ?? []).filter((e) => e.id !== edge.id),
        )
      : [];
  const kinds: EdgeKind[] = [edge.kind, ...others.filter((k) => k !== edge.kind)];

  return (
    <div className="inspector-form">
      <dl className="edge-ends">
        <dt>{t.from}</dt>
        <dd>{from?.title ?? '?'}</dd>
        <dt>{t.to}</dt>
        <dd>{to?.title ?? '?'}</dd>
      </dl>

      <Field label={t.kind}>
        <select
          value={edge.kind}
          onChange={(e) => {
            const result = setEdgeKind(edge.id, e.target.value as EdgeKind);
            if (!result.ok) notify(result.reason);
          }}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {strings.edgeKinds[k].label}
            </option>
          ))}
        </select>
      </Field>
      <p className="muted hint">{strings.edgeKinds[edge.kind].hint}</p>

      <Field label={t.label}>
        <input
          type="text"
          value={edge.label ?? ''}
          placeholder={t.labelPlaceholder}
          onChange={(e) =>
            updateEdge(
              edge.id,
              { label: e.target.value === '' ? undefined : e.target.value },
              { coalesce: `edge-label:${edge.id}` },
            )
          }
        />
      </Field>

      <div className="inspector-actions">
        <button type="button" className="danger" onClick={() => removeEdges([edge.id])}>
          {t.delete}
        </button>
      </div>
    </div>
  );
}
