import dagre from '@dagrejs/dagre';
import type { GameEdge, GameNode, Point } from '../model/types';
import { NODE_H, NODE_W } from './onionLayout';

// Arranges nodes left to right along their edges, so a chain of triggers reads
// like a sentence. Nodes without edges are placed in the first column.
// Returns the top-left position of every node.
export function autoLayout(nodes: GameNode[], edges: GameEdge[]): Record<string, Point> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 130, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));

  const known = new Set(nodes.map((n) => n.id));
  for (const node of nodes) g.setNode(node.id, { width: NODE_W, height: NODE_H });
  for (const edge of edges) {
    if (edge.source !== edge.target && known.has(edge.source) && known.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  const positions: Record<string, Point> = {};
  for (const node of nodes) {
    const placed = g.node(node.id);
    positions[node.id] = { x: placed.x - NODE_W / 2, y: placed.y - NODE_H / 2 };
  }
  return positions;
}
