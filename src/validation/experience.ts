import { isVagueDescription, missingOcean, OCEAN_KEYS } from '../designPath/steps';
import { kindGroup } from '../model/edgeRules';
import { strings } from '../lib/strings';
import { issue, nodeMap, titleOf, type Issue, type RuleContext } from './types';

export function vagueExperience(ctx: RuleContext): Issue[] {
  return ctx.graph.nodes
    .filter((n) => n.kind === 'aesthetic' && isVagueDescription(n))
    .map((n) =>
      issue(
        'vagueExperience',
        'info',
        ctx,
        [n.id],
        strings.validation.messages.vagueExperience(titleOf(n, ctx)),
      ),
    );
}

export function personaWithoutOcean(ctx: RuleContext): Issue[] {
  return ctx.graph.nodes
    .filter((n) => n.kind === 'persona' && missingOcean(n))
    .map((n) => {
      const missing = OCEAN_KEYS.filter((k) => n.ocean?.[k] === undefined)
        .map((k) => strings.oceanTraits[k])
        .join(', ');
      return issue(
        'personaWithoutOcean',
        'info',
        ctx,
        [n.id],
        strings.validation.messages.personaWithoutOcean(titleOf(n, ctx), missing),
      );
    });
}

// An aesthetic or pillar is supported when some mechanic reaches it, either
// through a chain of "leads to" edges or directly with "serves".
export function unsupportedAesthetic(ctx: RuleContext): Issue[] {
  const { graph, project } = ctx;
  const nodes = nodeMap(graph);
  const incoming = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.kind !== 'leadsTo' && e.kind !== 'serves') continue;
    incoming.set(e.target, [...(incoming.get(e.target) ?? []), e.source]);
  }

  const reachedByMechanic = (start: string): boolean => {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
      const id = queue.pop();
      for (const from of (id && incoming.get(id)) || []) {
        if (seen.has(from)) continue;
        seen.add(from);
        const node = nodes.get(from);
        if (node && kindGroup(node, project.customKinds) === 'mechanic') return true;
        queue.push(from);
      }
    }
    return false;
  };

  return graph.nodes
    .filter((n) => (n.kind === 'aesthetic' || n.kind === 'pillar') && !reachedByMechanic(n.id))
    .map((n) =>
      issue(
        'unsupportedAesthetic',
        'warning',
        ctx,
        [n.id],
        strings.validation.messages.unsupportedAesthetic(
          titleOf(n, ctx),
          strings.kinds[n.kind as 'aesthetic' | 'pillar'].toLowerCase(),
        ),
      ),
    );
}
