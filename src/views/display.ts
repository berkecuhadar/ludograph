import { stepMatches, type StepId } from '../designPath/steps';
import type { GameEdge, GameNode, Status } from '../model/types';
import { crossesOnion } from '../validation/onionHeuristic';
import { leadsToChain, type Chain } from './chains';

export type Filter = { statuses: Status[]; tag: string | null };

export type DisplayInput = {
  nodes: GameNode[];
  edges: GameEdge[];
  view: 'graph' | 'onion' | 'mda';
  pathStep: StepId | null;
  filter: Filter;
  coreOnly: boolean;
  selectedNodeIds: string[];
  onionHeuristic: boolean;
};

export type Display = {
  /** Nodes drawn faded out. */
  dimmed: Set<string>;
  /** Nodes in layers 1 to 3 while core-only mode is on. */
  deferred: Set<string>;
  /** In the MDA view, the leads-to chain around the selection. */
  chain: Chain | null;
  /** Edges that break the onion heuristic (Onion view). */
  warnEdges: Set<string>;
};

export function isFilterActive(filter: Filter): boolean {
  return filter.statuses.length > 0 || filter.tag !== null;
}

export function matchesFilter(filter: Filter, node: GameNode): boolean {
  if (filter.statuses.length > 0 && !filter.statuses.includes(node.status)) return false;
  if (filter.tag !== null && !node.tags.includes(filter.tag)) return false;
  return true;
}

export function computeDisplay(input: DisplayInput): Display {
  const { nodes, edges, view, pathStep, filter, coreOnly, selectedNodeIds } = input;
  const dimmed = new Set<string>();
  const deferred = new Set<string>();

  let chain: Chain | null = null;
  if (view === 'mda' && selectedNodeIds.length > 0) {
    const found = leadsToChain(edges, selectedNodeIds);
    // Only worth fading the rest when the selection actually belongs to a chain.
    if (found.nodes.size > selectedNodeIds.length) chain = found;
  }

  for (const node of nodes) {
    if (coreOnly && node.layer !== undefined && node.layer >= 1) {
      deferred.add(node.id);
      dimmed.add(node.id);
    }
    if (pathStep && !stepMatches(pathStep, node)) dimmed.add(node.id);
    if (isFilterActive(filter) && !matchesFilter(filter, node)) dimmed.add(node.id);
    if (chain && !chain.nodes.has(node.id)) dimmed.add(node.id);
  }

  const warnEdges = new Set<string>();
  if (view === 'onion' && input.onionHeuristic) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const edge of edges) {
      if (edge.kind !== 'requires') continue;
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (source && target && crossesOnion(source, target)) warnEdges.add(edge.id);
    }
  }

  return { dimmed, deferred, chain, warnEdges };
}
