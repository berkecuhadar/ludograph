import type { ReactNode } from 'react';
import { strings } from '../../lib/strings';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

type SelectFieldProps<T extends string> = {
  label: string;
  value: T | undefined;
  options: readonly T[];
  labels: Record<T, string>;
  /** Offer an empty choice. The text is what it is called. */
  empty?: string;
  onChange: (value: T | undefined) => void;
};

export function SelectField<T extends string>({
  label,
  value,
  options,
  labels,
  empty,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <Field label={label}>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : (e.target.value as T))}
      >
        {empty !== undefined && <option value="">{empty}</option>}
        {value === undefined && empty === undefined && (
          <option value="">{strings.inspector.none}</option>
        )}
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </Field>
  );
}
