import { describe, expect, it } from 'vitest';
import { createNode } from '../model/factory';
import type { GameNode, Layer } from '../model/types';
import { classifyOnion, layoutOnion, NODE_H, NODE_W } from './onionLayout';

const make = (count: number, layer: Layer | undefined): GameNode[] =>
  Array.from({ length: count }, () => {
    const node = createNode('mechanic', { x: 0, y: 0 });
    if (layer === undefined) delete node.layer;
    else node.layer = layer;
    return node;
  });

const overlap = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) < NODE_W && Math.abs(a.y - b.y) < NODE_H;

describe('layoutOnion', () => {
  it('builds four rings from the center outwards', () => {
    const { geometry } = layoutOnion([]);
    expect(geometry.rings.map((r) => r.layer)).toEqual([0, 1, 2, 3]);
    expect(geometry.rings[0]?.inner).toBe(0);
    for (let i = 1; i < 4; i++) {
      expect(geometry.rings[i]?.inner).toBe(geometry.rings[i - 1]?.outer);
    }
  });

  it('puts each node inside the ring of its layer', () => {
    const nodes = [...make(3, 0), ...make(2, 1), ...make(2, 2), ...make(1, 3)];
    const { geometry, positions } = layoutOnion(nodes);
    for (const node of nodes) {
      const p = positions[node.id];
      if (!p) throw new Error('missing position');
      const r = Math.hypot(p.x + NODE_W / 2, p.y + NODE_H / 2);
      const ring = geometry.rings[node.layer ?? 0];
      expect(r).toBeGreaterThanOrEqual(ring?.inner ?? 0);
      expect(r).toBeLessThan(ring?.outer ?? 0);
    }
  });

  it('never overlaps two cards, even with a big core', () => {
    const nodes = [
      ...make(40, 0),
      ...make(12, 1),
      ...make(9, 2),
      ...make(5, 3),
      ...make(14, undefined),
    ];
    const { positions } = layoutOnion(nodes);
    const list = nodes.map((n) => positions[n.id]);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a && b) expect(overlap(a, b)).toBe(false);
      }
    }
  });

  it('puts nodes without a layer in the tray, left of the rings', () => {
    const nodes = [...make(2, 0), ...make(3, undefined)];
    const { geometry, positions } = layoutOnion(nodes);
    for (const node of nodes.filter((n) => n.layer === undefined)) {
      const p = positions[node.id];
      expect((p?.x ?? 0) + NODE_W / 2).toBeLessThan(geometry.trayEdge);
    }
  });

  it('keeps a dragged position while it is inside the right ring', () => {
    const nodes = make(1, 0);
    const id = nodes[0]?.id ?? '';
    const own = { x: 40 - NODE_W / 2, y: 20 - NODE_H / 2 };
    expect(layoutOnion(nodes, { [id]: own }).positions[id]).toEqual(own);
  });

  it('ignores a dragged position that is no longer in the right ring', () => {
    const nodes = make(1, 1);
    const id = nodes[0]?.id ?? '';
    const own = { x: 0, y: 0 };
    expect(layoutOnion(nodes, { [id]: own }).positions[id]).not.toEqual(own);
  });
});

describe('classifyOnion', () => {
  const { geometry } = layoutOnion([]);
  const at = (x: number, y: number) => ({ x: x - NODE_W / 2, y: y - NODE_H / 2 });

  it('finds the layer for a drop point', () => {
    expect(classifyOnion(at(0, 0), geometry)).toBe(0);
    const [, secondary, progression, narrative] = geometry.rings;
    expect(classifyOnion(at((secondary?.inner ?? 0) + 10, 0), geometry)).toBe(1);
    expect(classifyOnion(at((progression?.inner ?? 0) + 10, 0), geometry)).toBe(2);
    expect(classifyOnion(at((narrative?.inner ?? 0) + 10, 0), geometry)).toBe(3);
  });

  it('treats the far left as the tray and far outside as narrative', () => {
    expect(classifyOnion(at(geometry.trayEdge - 50, 0), geometry)).toBeNull();
    expect(classifyOnion(at(0, geometry.outerRadius + 500), geometry)).toBe(3);
  });
});
