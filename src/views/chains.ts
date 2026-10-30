import type { GameEdge } from '../model/types';

export type Chain = { nodes: Set<string>; edges: Set<string> };

// Everything connected to the selected nodes by "leads to" edges: what they lead
// to, and what leads to them. Selecting an aesthetic therefore lights up every
// mechanic and dynamic on the way to it. The two directions are walked
// separately, so a sibling chain that only shares a downstream node stays dark.
export function leadsToChain(edges: readonly GameEdge[], selected: Iterable<string>): Chain {
  const leads = edges.filter((e) => e.kind === 'leadsTo');
  const start = [...selected];
  const nodes = new Set<string>(start);
  const chainEdges = new Set<string>();

  const walk = (from: 'source' | 'target', to: 'source' | 'target') => {
    const seen = new Set<string>(start);
    const queue = [...start];
    while (queue.length > 0) {
      const id = queue.pop();
      for (const e of leads) {
        if (e[from] !== id) continue;
        chainEdges.add(e.id);
        const next = e[to];
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    for (const id of seen) nodes.add(id);
  };

  walk('source', 'target');
  walk('target', 'source');
  return { nodes, edges: chainEdges };
}
