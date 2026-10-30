import { useState } from 'react';
import Markdown from 'react-markdown';
import { strings } from '../../lib/strings';

type Props = { value: string; onChange: (value: string) => void };

export function MarkdownField({ value, onChange }: Props) {
  const [preview, setPreview] = useState(false);
  const t = strings.inspector;

  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">{t.description}</span>
        <span className="tabs" role="group" aria-label={t.description}>
          <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
            {t.write}
          </button>
          <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>
            {t.preview}
          </button>
        </span>
      </div>
      {preview ? (
        <div className="markdown">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="muted">{t.noDescription}</p>}
        </div>
      ) : (
        <textarea
          rows={6}
          value={value}
          aria-label={t.description}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
