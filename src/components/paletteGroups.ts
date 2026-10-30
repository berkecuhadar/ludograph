import { strings } from '../lib/strings';
import type { CustomKind, GameNode, NodeKind } from '../model/types';

export type PaletteEntry = {
  id: string;
  label: string;
  kind: NodeKind;
  overrides?: Partial<GameNode>;
};

export type PaletteGroup = { id: string; label: string; entries: PaletteEntry[] };

const entry = (kind: NodeKind, label: string): PaletteEntry => ({ id: kind, label, kind });

export function paletteGroups(customKinds: CustomKind[]): PaletteGroup[] {
  const k = strings.kinds;
  const g = strings.palette.groups;
  const groups: PaletteGroup[] = [
    {
      id: 'experience',
      label: g.experience,
      entries: [
        entry('pillar', k.pillar),
        entry('aesthetic', k.aesthetic),
        entry('persona', k.persona),
        entry('dynamic', k.dynamic),
      ],
    },
    {
      id: 'mechanics',
      label: g.mechanics,
      entries: [
        entry('coreLoop', k.coreLoop),
        entry('mechanic', k.mechanic),
        {
          id: 'secondaryMechanic',
          label: strings.palette.secondaryMechanic,
          kind: 'mechanic',
          overrides: { layer: 1 },
        },
        entry('subMechanic', k.subMechanic),
        entry('action', k.action),
        entry('state', k.state),
        entry('event', k.event),
        entry('rule', k.rule),
        entry('entity', k.entity),
        entry('resource', k.resource),
      ],
    },
    {
      id: 'outer',
      label: g.outer,
      entries: [
        entry('item', k.item),
        entry('progression', k.progression),
        entry('narrative', k.narrative),
      ],
    },
    { id: 'other', label: g.other, entries: [entry('note', k.note)] },
  ];
  if (customKinds.length > 0) {
    groups.push({
      id: 'custom',
      label: g.custom,
      entries: customKinds.map((c) => entry(`custom:${c.id}`, c.name)),
    });
  }
  return groups;
}
