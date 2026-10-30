import { strings } from '../../lib/strings';
import type { Ocean } from '../../model/types';

type Props = { ocean: Partial<Ocean> | undefined; onChange: (ocean: Partial<Ocean>) => void };

const TRAITS = ['o', 'c', 'e', 'a', 'n'] as const;

export function OceanEditor({ ocean = {}, onChange }: Props) {
  const t = strings.inspector;

  const set = (trait: keyof Ocean, value: number | undefined) => {
    const next = { ...ocean };
    if (value === undefined) delete next[trait];
    else next[trait] = value;
    onChange(next);
  };

  return (
    <fieldset className="field ocean">
      <legend className="field-label">{t.ocean}</legend>
      {TRAITS.map((trait) => {
        const value = ocean[trait];
        const name = strings.oceanTraits[trait];
        return (
          <div key={trait} className="ocean-row">
            <span>{name}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={value ?? 50}
              aria-label={name}
              data-unset={value === undefined}
              onChange={(e) => set(trait, Number(e.target.value))}
            />
            <output className="mono">{value ?? t.unset}</output>
            <button
              type="button"
              className="small"
              disabled={value === undefined}
              onClick={() => set(trait, undefined)}
            >
              {t.clear}
            </button>
          </div>
        );
      })}
    </fieldset>
  );
}
