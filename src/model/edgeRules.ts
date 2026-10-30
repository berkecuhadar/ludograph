import { strings } from '../lib/strings';
import { findCustomKind, isCustomKind } from './kinds';
import { EDGE_KINDS, type CustomKind, type EdgeKind, type GameEdge, type GameNode } from './types';

// Edge rules talk about groups of kinds, not single kinds, so that a new
// built-in or custom kind only has to be placed in one group.
export type KindGroup = 'mechanic' | 'dynamic' | 'aesthetic' | 'pillar' | 'persona' | 'note';

export function kindGroup(node: Pick<GameNode, 'kind'>, customKinds: CustomKind[]): KindGroup {
  const { kind } = node;
  if (isCustomKind(kind)) {
    const custom = findCustomKind(kind, customKinds);
    if (custom?.mda === 'dynamics') return 'dynamic';
    if (custom?.mda === 'aesthetics') return 'aesthetic';
    return 'mechanic';
  }
  switch (kind) {
    case 'pillar':
    case 'aesthetic':
    case 'persona':
    case 'dynamic':
    case 'note':
      return kind;
    default:
      return 'mechanic';
  }
}

type Rule = { from: readonly KindGroup[]; to: readonly KindGroup[] };

const MECHANIC: readonly KindGroup[] = ['mechanic'];
const EXPERIENCE: readonly KindGroup[] = ['mechanic', 'dynamic', 'aesthetic', 'pillar'];

// The one place that says which kinds of node an edge may connect.
export const EDGE_RULES: Record<EdgeKind, Rule> = {
  feeds: { from: MECHANIC, to: MECHANIC },
  requires: { from: MECHANIC, to: MECHANIC },
  unlocks: { from: MECHANIC, to: MECHANIC },
  triggers: { from: MECHANIC, to: MECHANIC },
  modifies: { from: MECHANIC, to: MECHANIC },
  conflicts: { from: EXPERIENCE, to: EXPERIENCE },
  leadsTo: { from: ['mechanic', 'dynamic'], to: ['dynamic', 'aesthetic'] },
  serves: {
    from: ['mechanic', 'dynamic', 'aesthetic', 'pillar', 'persona', 'note'],
    to: ['pillar', 'aesthetic'],
  },
};

export type EdgeCheck = { ok: true } | { ok: false; reason: string };

const list = (groups: readonly KindGroup[]) =>
  groups.map((g) => strings.groups.plural[g]).join(', ');

export function checkEdge(
  kind: EdgeKind,
  source: GameNode,
  target: GameNode,
  customKinds: CustomKind[],
  existing: readonly GameEdge[],
  ignoreEdgeId?: string,
): EdgeCheck {
  const t = strings.edgeErrors;
  if (source.id === target.id) return { ok: false, reason: t.self };

  const from = kindGroup(source, customKinds);
  const to = kindGroup(target, customKinds);
  const rule = EDGE_RULES[kind];
  if (!rule.from.includes(from) || !rule.to.includes(to)) {
    return {
      ok: false,
      reason: t.pair(
        strings.edgeKinds[kind].label,
        strings.groups.singular[from],
        strings.groups.singular[to],
        list(rule.from),
        list(rule.to),
      ),
    };
  }

  const duplicate = existing.some(
    (e) =>
      e.id !== ignoreEdgeId && e.kind === kind && e.source === source.id && e.target === target.id,
  );
  if (duplicate) return { ok: false, reason: t.duplicate(strings.edgeKinds[kind].label) };

  return { ok: true };
}

export function allowedEdgeKinds(
  source: GameNode,
  target: GameNode,
  customKinds: CustomKind[],
  existing: readonly GameEdge[],
): EdgeKind[] {
  return EDGE_KINDS.filter((k) => checkEdge(k, source, target, customKinds, existing).ok);
}

// Why two nodes can't be connected at all, for the message shown after a rejected drag.
export function explainNoEdge(
  source: GameNode,
  target: GameNode,
  customKinds: CustomKind[],
): string {
  if (source.id === target.id) return strings.edgeErrors.self;
  const from = kindGroup(source, customKinds);
  const to = kindGroup(target, customKinds);
  const pairPossible = EDGE_KINDS.some(
    (k) => EDGE_RULES[k].from.includes(from) && EDGE_RULES[k].to.includes(to),
  );
  return pairPossible
    ? strings.edgeErrors.alreadyConnected
    : strings.edgeErrors.noKind(strings.groups.singular[from], strings.groups.singular[to]);
}
