import { strings } from '../lib/strings';
import type { BuiltinKind, CustomKind, Layer, Mda, NodeKind } from './types';

type KindDefaults = { mda: Mda; layer?: Layer };

// Starting point for a new node of each kind. Both values can be changed per node.
export const KIND_DEFAULTS: Record<BuiltinKind, KindDefaults> = {
  pillar: { mda: 'aesthetics' },
  aesthetic: { mda: 'aesthetics' },
  persona: { mda: 'aesthetics' },
  dynamic: { mda: 'dynamics' },
  action: { mda: 'mechanics', layer: 0 },
  coreLoop: { mda: 'mechanics', layer: 0 },
  mechanic: { mda: 'mechanics', layer: 0 },
  state: { mda: 'mechanics', layer: 0 },
  subMechanic: { mda: 'mechanics', layer: 0 },
  rule: { mda: 'mechanics', layer: 0 },
  entity: { mda: 'mechanics', layer: 0 },
  event: { mda: 'mechanics', layer: 0 },
  resource: { mda: 'mechanics', layer: 0 },
  item: { mda: 'mechanics', layer: 2 },
  progression: { mda: 'mechanics', layer: 2 },
  narrative: { mda: 'mechanics', layer: 3 },
  note: { mda: 'mechanics' },
};

export function isCustomKind(kind: NodeKind): kind is `custom:${string}` {
  return kind.startsWith('custom:');
}

export function findCustomKind(kind: NodeKind, customKinds: CustomKind[]): CustomKind | undefined {
  if (!isCustomKind(kind)) return undefined;
  const id = kind.slice('custom:'.length);
  return customKinds.find((k) => k.id === id);
}

export function defaultsForKind(kind: NodeKind, customKinds: CustomKind[]): KindDefaults {
  if (!isCustomKind(kind)) return KIND_DEFAULTS[kind];
  const custom = findCustomKind(kind, customKinds);
  // A node can outlive its custom kind if the user deletes it, so don't throw here.
  if (!custom) return { mda: 'mechanics' };
  return custom.layer === undefined
    ? { mda: custom.mda }
    : { mda: custom.mda, layer: custom.layer };
}

export function kindLabel(kind: NodeKind, customKinds: CustomKind[]): string {
  if (!isCustomKind(kind)) return strings.kinds[kind];
  return findCustomKind(kind, customKinds)?.name ?? kind.slice('custom:'.length);
}
