import { useState, type KeyboardEvent } from 'react';
import { strings } from '../../lib/strings';

type Props = { tags: string[]; onChange: (tags: string[]) => void };

export function TagsEditor({ tags, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const t = strings.inspector;

  const add = () => {
    const tag = draft.trim();
    setDraft('');
    if (tag && !tags.includes(tag)) onChange([...tags, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };

  return (
    <div className="field">
      <span className="field-label">{t.tags}</span>
      {tags.length > 0 && (
        <ul className="chips">
          {tags.map((tag) => (
            <li key={tag}>
              {tag}
              <button
                type="button"
                aria-label={t.removeTag(tag)}
                onClick={() => onChange(tags.filter((x) => x !== tag))}
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        type="text"
        value={draft}
        placeholder={t.tagPlaceholder}
        aria-label={t.tags}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
    </div>
  );
}
