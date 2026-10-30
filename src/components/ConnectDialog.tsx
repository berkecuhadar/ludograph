import { useState, type FormEvent } from 'react';
import { strings } from '../lib/strings';
import { checkEdge } from '../model/edgeRules';
import { EDGE_KINDS, type EdgeKind } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { EdgeKindIcon } from './EdgeKindIcon';
import { Modal } from './Modal';
import './ConnectDialog.css';

function ConnectBody({ source, target }: { source: string; target: string }) {
  const project = useProjectStore((s) => s.project);
  const activeGraphId = useProjectStore((s) => s.activeGraphId);
  const connectNodes = useProjectStore((s) => s.connectNodes);
  const lastEdgeKind = useUiStore((s) => s.lastEdgeKind);
  const setLastEdgeKind = useUiStore((s) => s.setLastEdgeKind);
  const setDialog = useUiStore((s) => s.setDialog);
  const notify = useUiStore((s) => s.notify);
  const t = strings.connect;

  const graph = project.graphs[activeGraphId];
  const from = graph?.nodes.find((n) => n.id === source);
  const to = graph?.nodes.find((n) => n.id === target);

  const checks = EDGE_KINDS.map((kind) => ({
    kind,
    result:
      from && to
        ? checkEdge(kind, from, to, project.customKinds, graph?.edges ?? [])
        : ({ ok: false, reason: strings.edgeErrors.missing } as const),
  }));
  const allowed = (kind: EdgeKind) => checks.find((c) => c.kind === kind)?.result.ok === true;
  const firstAllowed = checks.find((c) => c.result.ok)?.kind;
  const [chosen, setChosen] = useState<EdgeKind | undefined>(
    allowed(lastEdgeKind) ? lastEdgeKind : firstAllowed,
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!chosen) return;
    const result = connectNodes(source, target, chosen);
    if (result.ok) setLastEdgeKind(chosen);
    else notify(result.reason);
    setDialog(null);
  };

  return (
    <form className="modal-body connect" onSubmit={submit}>
      <h2>{t.title}</h2>
      <p className="muted">{t.summary(from?.title ?? '?', to?.title ?? '?')}</p>
      <fieldset>
        <legend className="sr-only">{t.title}</legend>
        {checks.map(({ kind, result }) => (
          <label key={kind} className="connect-option" data-disabled={!result.ok}>
            <input
              type="radio"
              name="edge-kind"
              value={kind}
              checked={chosen === kind}
              disabled={!result.ok}
              autoFocus={chosen === kind}
              onChange={() => setChosen(kind)}
            />
            <EdgeKindIcon kind={kind} />
            <span className="connect-text">
              <strong>{strings.edgeKinds[kind].label}</strong>
              <span className="muted">
                {result.ok ? strings.edgeKinds[kind].hint : t.notAllowed}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="connect-actions">
        <button type="button" onClick={() => setDialog(null)}>
          {t.cancel}
        </button>
        <button type="submit" className="primary" disabled={!chosen}>
          {t.add}
        </button>
      </div>
    </form>
  );
}

export function ConnectDialog() {
  const open = useUiStore((s) => s.dialog === 'connect');
  const pending = useUiStore((s) => s.pendingConnection);
  const setDialog = useUiStore((s) => s.setDialog);

  return (
    <Modal open={open} title={strings.connect.title} onClose={() => setDialog(null)}>
      {pending && <ConnectBody source={pending.source} target={pending.target} />}
    </Modal>
  );
}
