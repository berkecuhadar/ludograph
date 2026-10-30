import { describe, expect, it } from 'vitest';
import { BUILTIN_KINDS } from '../model/types';
import { filterEntries, paletteGroups } from './paletteGroups';

describe('filterEntries', () => {
  const groups = paletteGroups([]);

  it('returns everything for an empty query', () => {
    expect(filterEntries(groups, '  ').length).toBeGreaterThan(15);
  });

  it('matches part of a label, ignoring case', () => {
    const labels = filterEntries(groups, 'MECH').map((e) => e.label);
    expect(labels).toContain('Mechanic');
    expect(labels).toContain('Secondary mechanic');
    expect(labels).toContain('Sub-mechanic');
    expect(labels).not.toContain('Pillar');
  });

  it('returns nothing when there is no match', () => {
    expect(filterEntries(groups, 'zzz')).toEqual([]);
  });
});

describe('paletteGroups', () => {
  it('offers every built-in kind', () => {
    const kinds = paletteGroups([]).flatMap((g) => g.entries.map((e) => e.kind));
    for (const kind of BUILTIN_KINDS) expect(kinds).toContain(kind);
  });

  it('has a secondary mechanic entry that is a layer 1 mechanic', () => {
    const entries = paletteGroups([]).flatMap((g) => g.entries);
    const secondary = entries.find((e) => e.id === 'secondaryMechanic');
    expect(secondary?.kind).toBe('mechanic');
    expect(secondary?.overrides?.layer).toBe(1);
  });

  it('lists custom kinds in their own group', () => {
    const groups = paletteGroups([
      { id: 'card', name: 'Card', color: '#aa5500', icon: 'square', mda: 'mechanics' },
    ]);
    const custom = groups.find((g) => g.id === 'custom');
    expect(custom?.entries[0]?.kind).toBe('custom:card');
  });

  it('has unique entry ids', () => {
    const ids = paletteGroups([]).flatMap((g) => g.entries.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
