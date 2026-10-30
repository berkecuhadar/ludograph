import { useId } from 'react';
import { createPillarNodes, pullFromGraph } from '../../lib/documentActions';
import { GRAPH_SOURCES } from '../../gdd/fromGraph';
import type { FieldDef } from '../../gdd/sections';
import { strings } from '../../lib/strings';
import { useProjectStore } from '../../store/projectStore';

export function FieldEditor({ field }: { field: FieldDef }) {
  const id = useId();
  const value = useProjectStore((s) => s.project.gdd?.values[field.id] ?? '');
  const setValue = useProjectStore((s) => s.setGddValue);
  const source = GRAPH_SOURCES[field.id];
  const t = strings.document;

  return (
    <div className="doc-field">
      <div className="doc-field-head">
        <label htmlFor={id}>{field.label}</label>
        <span className="doc-field-tools">
          {source && (
            <button
              type="button"
              className="small"
              title={t.fromGraphTitle(source.hint)}
              onClick={() => void pullFromGraph(field.id)}
            >
              {t.fromGraph}
            </button>
          )}
          {field.id === 'pillars' && (
            <button
              type="button"
              className="small"
              title={t.createPillarsTitle}
              onClick={createPillarNodes}
            >
              {t.createPillars}
            </button>
          )}
        </span>
      </div>
      {field.hint && <p className="muted hint">{field.hint}</p>}
      {field.line ? (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      ) : (
        <textarea
          id={id}
          rows={field.rows ?? 3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
      )}
    </div>
  );
}
