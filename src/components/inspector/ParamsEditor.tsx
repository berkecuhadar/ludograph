import { useState } from 'react';
import { strings } from '../../lib/strings';
import type { Param } from '../../model/types';
import { parseParamValue } from './parseParam';

type RowProps = {
  param: Param;
  onChange: (param: Param) => void;
  onRemove: () => void;
};

function ParamRow({ param, onChange, onRemove }: RowProps) {
  const t = strings.inspector;
  // Keep what the user typed ("1." or "007"), and only reset it when the value
  // changed from outside, for example by undo.
  const [text, setText] = useState(String(param.value));
  if (parseParamValue(text) !== param.value) setText(String(param.value));

  return (
    <li className="param-row">
      <input
        type="text"
        className="mono"
        value={param.key}
        placeholder={t.paramName}
        aria-label={t.paramName}
        onChange={(e) => onChange({ ...param, key: e.target.value })}
      />
      <input
        type="text"
        className="mono"
        value={text}
        placeholder={t.paramValue}
        aria-label={t.paramValue}
        onChange={(e) => {
          setText(e.target.value);
          onChange({ ...param, value: parseParamValue(e.target.value) });
        }}
      />
      <button type="button" aria-label={t.removeParam} onClick={onRemove}>
        x
      </button>
    </li>
  );
}

type Props = { params: Param[]; onChange: (params: Param[]) => void };

export function ParamsEditor({ params, onChange }: Props) {
  const t = strings.inspector;

  return (
    <div className="field">
      <span className="field-label">{t.params}</span>
      {params.length > 0 && (
        <ul className="params">
          {params.map((param, i) => (
            <ParamRow
              key={i}
              param={param}
              onChange={(next) => onChange(params.map((p, j) => (j === i ? next : p)))}
              onRemove={() => onChange(params.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      )}
      <button
        type="button"
        className="small"
        onClick={() => onChange([...params, { key: '', value: '' }])}
      >
        {t.addParam}
      </button>
    </div>
  );
}
