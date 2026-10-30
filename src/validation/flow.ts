import { strings } from '../lib/strings';
import { issue, nodeMap, titleOf, type Issue, type RuleContext } from './types';

// A mechanic or sub-mechanic should lead somewhere a player can feel it: a
// dynamic or an aesthetic, directly or through other nodes, along "leads to" edges.
export function danglingMechanic(ctx: RuleContext): Issue[] {
  const nodes = nodeMap(ctx.graph);
  const next = new Map<string, string[]>();
  for (const e of ctx.graph.edges) {
    if (e.kind === 'leadsTo') next.set(e.source, [...(next.get(e.source) ?? []), e.target]);
  }

  const leadsToExperience = (start: string): boolean => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const id = queue.pop();
      for (const to of (id && next.get(id)) || []) {
        if (seen.has(to)) continue;
        seen.add(to);
        const kind = nodes.get(to)?.kind;
        if (kind === 'dynamic' || kind === 'aesthetic') return true;
        queue.push(to);
      }
    }
    return false;
  };

  return ctx.graph.nodes
    .filter((n) => (n.kind === 'mechanic' || n.kind === 'subMechanic') && !leadsToExperience(n.id))
    .map((n) =>
      issue(
        'danglingMechanic',
        'warning',
        ctx,
        [n.id],
        strings.validation.messages.danglingMechanic(titleOf(n, ctx)),
      ),
    );
}

// A resource is produced by a source role or an incoming "feeds", and consumed by
// a sink role or an outgoing "feeds".
export function resourceFlow(ctx: RuleContext): Issue[] {
  const m = strings.validation.messages;
  return ctx.graph.nodes
    .filter((n) => n.kind === 'resource')
    .flatMap((n) => {
      const produced =
        n.resourceRole === 'source' ||
        ctx.graph.edges.some((e) => e.kind === 'feeds' && e.target === n.id);
      const consumed =
        n.resourceRole === 'sink' ||
        ctx.graph.edges.some((e) => e.kind === 'feeds' && e.source === n.id);
      const title = titleOf(n, ctx);
      const out: Issue[] = [];
      if (!produced) {
        out.push({
          ...issue('resourceFlow', 'warning', ctx, [n.id], m.resourceNeverProduced(title)),
          id: `resourceFlow:${ctx.graph.id}:${n.id}:produced`,
        });
      }
      if (!consumed) {
        out.push({
          ...issue('resourceFlow', 'warning', ctx, [n.id], m.resourceNeverConsumed(title)),
          id: `resourceFlow:${ctx.graph.id}:${n.id}:consumed`,
        });
      }
      return out;
    });
}
