import {
  CORE_BLOCKS,
  GROUPS,
  HEADER_FIELD_IDS,
  splitPillars,
  type FieldDef,
} from '../../gdd/sections';
import { strings } from '../../lib/strings';
import { useProjectStore } from '../../store/projectStore';

// A live view of the document as it will be written out. Print this to get a PDF.
export function DocumentPreview() {
  const t = strings.document;
  const gdd = useProjectStore((s) => s.project.gdd);
  const projectName = useProjectStore((s) => s.project.name);
  const text = (id: string) => (gdd?.values[id] ?? '').trim();

  const pillars = splitPillars(text('pillars'));
  const field = (f: FieldDef) => (
    <div key={f.id} className="doc-entry">
      <h3>{f.label}</h3>
      {text(f.id) ? <p>{text(f.id)}</p> : <p className="muted">{t.notWritten}</p>}
    </div>
  );

  return (
    <article className="doc-preview" aria-label={t.preview}>
      <h1>{text('title') || projectName || t.untitled}</h1>
      {text('mantra') && <p className="doc-mantra">{text('mantra')}</p>}
      {pillars.length > 0 && (
        <ul className="doc-pillars">
          {pillars.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {CORE_BLOCKS.map((block) => {
        const fields = block.fields.filter((f) => !HEADER_FIELD_IDS.includes(f.id));
        if (fields.length === 0) return null;
        return (
          <section key={block.id}>
            <h2>{block.title}</h2>
            {fields.map(field)}
          </section>
        );
      })}

      {GROUPS.filter((g) => gdd?.enabled[g.id]).map((group) => (
        <section key={group.id}>
          <h2>{group.title}</h2>
          {group.fields.map(field)}
        </section>
      ))}

      {gdd?.custom.map((section) => (
        <section key={section.id}>
          <h2>{section.title.trim() || t.untitledSection}</h2>
          {section.body.trim() ? (
            <p>{section.body.trim()}</p>
          ) : (
            <p className="muted">{t.notWritten}</p>
          )}
        </section>
      ))}
    </article>
  );
}
