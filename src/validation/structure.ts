import { strings } from '../lib/strings';
import { issue, nodeMap, titleOf, type Issue, type RuleContext } from './types';

// Every node should be connected to something. Notes are free-floating on purpose.
export function orphan(ctx: RuleContext): Issue[] {
  const connected = new Set(ctx.graph.edges.flatMap((e) => [e.source, e.target]));
  return ctx.graph.nodes
    .filter((n) => n.kind !== 'note' && !connected.has(n.id))
    .map((n) =>
      issue('orphan', 'info', ctx, [n.id], strings.validation.messages.orphan(titleOf(n, ctx))),
    );
}

// Finds loops among "requires" edges with Tarjan's strongly connected components.
export function requiresCycle(ctx: RuleContext): Issue[] {
  const nodes = nodeMap(ctx.graph);
  const next = new Map<string, string[]>();
  for (const e of ctx.graph.edges) {
    if (e.kind !== 'requires' || !nodes.has(e.source) || !nodes.has(e.target)) continue;
    next.set(e.source, [...(next.get(e.source) ?? []), e.target]);
  }

  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  let counter = 0;

  const visit = (v: string) => {
    index.set(v, counter);
    low.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);
    for (const w of next.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v) ?? 0, low.get(w) ?? 0));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v) ?? 0, index.get(w) ?? 0));
      }
    }
    if (low.get(v) === index.get(v)) {
      const group: string[] = [];
      let w: string | undefined;
      do {
        w = stack.pop();
        if (w === undefined) break;
        onStack.delete(w);
        group.push(w);
      } while (w !== v);
      const selfLoop = group.length === 1 && (next.get(v) ?? []).includes(v);
      if (group.length > 1 || selfLoop) cycles.push(group.reverse());
    }
  };

  for (const id of nodes.keys()) if (!index.has(id)) visit(id);

  return cycles.map((group) => {
    const titles = group.map((id) => `"${titleOf(nodes.get(id)!, ctx)}"`).join(', ');
    return issue(
      'requiresCycle',
      'error',
      ctx,
      group,
      strings.validation.messages.requiresCycle(titles),
    );
  });
}

export function implementedRequiresIdea(ctx: RuleContext): Issue[] {
  const nodes = nodeMap(ctx.graph);
  const found: Issue[] = [];
  for (const edge of ctx.graph.edges) {
    if (edge.kind !== 'requires') continue;
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (!source || !target || source.status !== 'implemented') continue;
    if (target.status !== 'idea' && target.status !== 'cut') continue;
    found.push(
      issue(
        'implementedRequiresIdea',
        'warning',
        ctx,
        [source.id, target.id],
        strings.validation.messages.implementedRequiresIdea(
          titleOf(source, ctx),
          titleOf(target, ctx),
          strings.status[target.status].toLowerCase(),
        ),
      ),
    );
  }
  return found;
}

export function duplicateTitles(ctx: RuleContext): Issue[] {
  const groups = new Map<string, typeof ctx.graph.nodes>();
  for (const n of ctx.graph.nodes) {
    const key = n.title.trim().toLowerCase();
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), n]);
  }
  return [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) =>
      issue(
        'duplicateTitle',
        'info',
        ctx,
        g.map((n) => n.id),
        strings.validation.messages.duplicateTitle(g[0]?.title.trim() ?? '', g.length),
      ),
    );
}
