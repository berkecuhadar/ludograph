import { describe, expect, it } from 'vitest';
import { createNode } from '../model/factory';
import type { GameEdge } from '../model/types';
import { autoLayout } from './autoLayout';
import { NODE_H, NODE_W } from './onionLayout';

const node = () => createNode('state', { x: 0, y: 0 });
const edge = (id: string, source: string, target: string): GameEdge => ({
  id,
  kind: 'triggers',
  source,
  target,
});

describe('autoLayout', () => {
  it('places a chain from left to right', () => {
    const [a, b, c] = [node(), node(), node()] as const;
    const p = autoLayout([a, b, c], [edge('1', a.id, b.id), edge('2', b.id, c.id)]);
    expect(p[a.id]?.x).toBeLessThan(p[b.id]?.x ?? 0);
    expect(p[b.id]?.x).toBeLessThan(p[c.id]?.x ?? 0);
  });

  it('gives every node a position, including ones without edges', () => {
    const [a, b, lonely] = [node(), node(), node()] as const;
    const p = autoLayout([a, b, lonely], [edge('1', a.id, b.id)]);
    expect(Object.keys(p).sort()).toEqual([a.id, b.id, lonely.id].sort());
  });

  it('copes with loops, self edges and edges to unknown nodes', () => {
    const [a, b] = [node(), node()] as const;
    const p = autoLayout(
      [a, b],
      [
        edge('1', a.id, b.id),
        edge('2', b.id, a.id),
        edge('3', a.id, a.id),
        edge('4', a.id, 'ghost'),
      ],
    );
    expect(Object.keys(p)).toHaveLength(2);
    expect(Number.isFinite(p[a.id]?.x)).toBe(true);
  });

  it('handles an empty graph', () => {
    expect(autoLayout([], [])).toEqual({});
  });

  it('does not overlap cards in a bigger graph with cross links', () => {
    const nodes = Array.from({ length: 40 }, () => node());
    const edges: GameEdge[] = [];
    nodes.forEach((n, i) => {
      const next = nodes[i + 1];
      const skip = nodes[i + 3];
      if (next) edges.push(edge(`a${i}`, n.id, next.id));
      if (skip) edges.push(edge(`b${i}`, n.id, skip.id));
    });
    const p = autoLayout(nodes, edges);
    const list = nodes.map((n) => p[n.id]);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a && b) {
          expect(Math.abs(a.x - b.x) < NODE_W && Math.abs(a.y - b.y) < NODE_H).toBe(false);
        }
      }
    }
  });
});
