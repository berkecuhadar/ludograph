import { useState, type FormEvent } from 'react';
import { strings } from '../../lib/strings';
import { CUSTOM_ICONS } from '../../model/customIcons';
import { MDA_AXES, type CustomKind, type Layer, type Mda } from '../../model/types';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { KindIcon } from '../KindIcon';

type Draft = { name: string; color: string; icon: string; mda: Mda; layer: string };

const EMPTY: Draft = { name: '', color: '#3f7fbf', icon: 'square', mda: 'mechanics', layer: '' };
const LAYERS: Layer[] = [0, 1, 2, 3];

function toDraft(kind: CustomKind): Draft {
  return {
    name: kind.name,
    color: kind.color,
    icon: kind.icon,
    mda: kind.mda,
    layer: kind.layer === undefined ? '' : String(kind.layer),
  };
}

export function CustomKindsEditor() {
  const t = strings.settings;
  const project = useProjectStore((s) => s.project);
  const addCustomKind = useProjectStore((s) => s.addCustomKind);
  const updateCustomKind = useProjectStore((s) => s.updateCustomKind);
  const removeCustomKind = useProjectStore((s) => s.removeCustomKind);
  const askConfirm = useUiStore((s) => s.askConfirm);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const reset = () => {
    setEditing(null);
    setDraft(EMPTY);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    const layer = draft.layer === '' ? undefined : (Number(draft.layer) as Layer);
    if (editing) {
      updateCustomKind(editing, {
        name,
        color: draft.color,
        icon: draft.icon,
        mda: draft.mda,
        layer,
      });
    } else {
      addCustomKind({
        name,
        color: draft.color,
        icon: draft.icon,
        mda: draft.mda,
        ...(layer === undefined ? {} : { layer }),
      });
    }
    reset();
  };

  const remove = async (kind: CustomKind) => {
    const token = `custom:${kind.id}`;
    const used = Object.values(project.graphs).reduce(
      (sum, g) => sum + g.nodes.filter((n) => n.kind === token).length,
      0,
    );
    if (used > 0 && !(await askConfirm(t.usedBy(kind.name, used), t.remove))) return;
    removeCustomKind(kind.id);
    if (editing === kind.id) reset();
  };

  return (
    <section className="settings-section">
      <h3>{t.customKinds}</h3>
      <p className="muted">{t.customKindsHint}</p>

      {project.customKinds.length === 0 ? (
        <p className="muted">{t.noKinds}</p>
      ) : (
        <ul className="kind-list">
          {project.customKinds.map((kind) => (
            <li key={kind.id}>
              <KindIcon icon={kind.icon} color={kind.color} />
              <span className="kind-name">{kind.name}</span>
              <span className="muted">
                {strings.mda[kind.mda]}
                {kind.layer === undefined ? '' : `, L${kind.layer}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditing(kind.id);
                  setDraft(toDraft(kind));
                }}
              >
                {t.edit}
              </button>
              <button type="button" className="danger" onClick={() => void remove(kind)}>
                {t.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="kind-form" onSubmit={submit}>
        <label className="field">
          <span className="field-label">{t.name}</span>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t.color}</span>
          <input
            type="color"
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="field-label">{t.icon}</span>
          <select value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })}>
            {CUSTOM_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t.mda}</span>
          <select
            value={draft.mda}
            onChange={(e) => setDraft({ ...draft, mda: e.target.value as Mda })}
          >
            {MDA_AXES.map((axis) => (
              <option key={axis} value={axis}>
                {strings.mda[axis]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t.layer}</span>
          <select
            value={draft.layer}
            onChange={(e) => setDraft({ ...draft, layer: e.target.value })}
          >
            <option value="">{t.noLayer}</option>
            {LAYERS.map((l) => (
              <option key={l} value={l}>
                {l} - {strings.layers[l]}
              </option>
            ))}
          </select>
        </label>
        <div className="kind-form-actions">
          <button type="submit" className="primary" disabled={!draft.name.trim()}>
            {editing ? t.saveKind : t.addKind}
          </button>
          {editing && (
            <button type="button" onClick={reset}>
              {t.cancelEdit}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
