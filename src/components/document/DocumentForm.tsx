import { CORE_BLOCKS, GROUPS } from '../../gdd/sections';
import type { GddSection } from '../../model/types';
import { strings } from '../../lib/strings';
import { useProjectStore } from '../../store/projectStore';
import { FieldEditor } from './FieldEditor';

// Selectors must return the same value when nothing changed, so the "no document
// yet" case uses these shared empties instead of a fresh {} or [] each time.
const NO_SECTIONS: GddSection[] = [];
const NO_ENABLED: Record<string, boolean> = {};

function CustomSections() {
  const t = strings.document;
  const custom = useProjectStore((s) => s.project.gdd?.custom ?? NO_SECTIONS);
  const add = useProjectStore((s) => s.addCustomSection);
  const update = useProjectStore((s) => s.updateCustomSection);
  const remove = useProjectStore((s) => s.removeCustomSection);

  return (
    <section className="doc-block">
      <h2>{t.customSections}</h2>
      {custom.map((section) => (
        <div key={section.id} className="doc-custom">
          <input
            type="text"
            value={section.title}
            placeholder={t.customTitle}
            aria-label={t.customTitle}
            onChange={(e) => update(section.id, { title: e.target.value })}
          />
          <textarea
            rows={4}
            value={section.body}
            placeholder={t.customBody}
            aria-label={t.customBody}
            onChange={(e) => update(section.id, { body: e.target.value })}
          />
          <button type="button" className="small danger" onClick={() => remove(section.id)}>
            {t.removeSection}
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        {t.addSection}
      </button>
    </section>
  );
}

export function DocumentForm() {
  const enabled = useProjectStore((s) => s.project.gdd?.enabled ?? NO_ENABLED);
  const setEnabled = useProjectStore((s) => s.setGddEnabled);

  return (
    <div className="doc-form">
      {CORE_BLOCKS.map((block) => (
        <section key={block.id} className="doc-block">
          <h2>{block.title}</h2>
          {block.fields.map((field) => (
            <FieldEditor key={field.id} field={field} />
          ))}
        </section>
      ))}

      <h2 className="doc-heading">{strings.document.optionalSections}</h2>
      {GROUPS.map((group) => {
        const on = enabled[group.id] === true;
        return (
          <section key={group.id} className="doc-block" data-open={on}>
            <label className="check doc-question">
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setEnabled(group.id, e.target.checked)}
              />
              <span>
                <strong>{group.title}</strong>
                <span className="muted"> - {group.question}</span>
              </span>
            </label>
            {on && group.fields.map((field) => <FieldEditor key={field.id} field={field} />)}
          </section>
        );
      })}

      <CustomSections />
    </div>
  );
}
