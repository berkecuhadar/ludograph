import { strings } from '../lib/strings';
import type { GameNode } from '../model/types';
import { issue, nodeMap, titleOf, type Issue, type RuleContext } from './types';

// `source` requires `target`. That breaks Ludograph's runtime-dependency
// heuristic when the target sits in a more outer layer than the source.
// Only nodes that have a layer are compared.
export function crossesOnion(source: GameNode, target: GameNode): boolean {
  if (source.layer === undefined || target.layer === undefined) return false;
  return target.layer > source.layer;
}

// Ludograph's own rule, not part of the Onion Model. Can be switched off in settings.
export function onionHeuristic(ctx: RuleContext): Issue[] {
  if (!ctx.settings.onionHeuristic) return [];
  const nodes = nodeMap(ctx.graph);
  const found: Issue[] = [];
  for (const edge of ctx.graph.edges) {
    if (edge.kind !== 'requires') continue;
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target || !crossesOnion(source, target)) continue;
    found.push(
      issue(
        'onionHeuristic',
        'warning',
        ctx,
        [source.id, target.id],
        strings.validation.messages.onionHeuristic(
          titleOf(source, ctx),
          source.layer ?? 0,
          titleOf(target, ctx),
          target.layer ?? 0,
        ),
      ),
    );
  }
  return found;
}
