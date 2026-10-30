import { describe, expect, it } from 'vitest';
import { createNode } from '../model/factory';
import type { Mda } from '../model/types';
import { classifyMda, layoutMda } from './mdaLayout';
import { NODE_H, NODE_W } from './onionLayout';

const make = (count: number, mda: Mda) =>
  Array.from({ length: count }, () => createNode('mechanic', { x: 0, y: 0 }, [], { mda }));

describe('layoutMda', () => {
  it('lays out mechanics, dynamics and aesthetics from left to right', () => {
    const { geometry } = layoutMda([]);
    expect(geometry.lanes.map((l) => l.mda)).toEqual(['mechanics', 'dynamics', 'aesthetics']);
    expect(geometry.lanes[1]?.x0).toBe(geometry.lanes[0]?.x1);
    expect(geometry.lanes[2]?.x0).toBe(geometry.lanes[1]?.x1);
  });

  it('puts each node in the lane of its mda', () => {
    const nodes = [...make(3, 'mechanics'), ...make(2, 'dynamics'), ...make(1, 'aesthetics')];
    const { geometry, positions } = layoutMda(nodes);
    for (const node of nodes) {
      const p = positions[node.id];
      const lane = geometry.lanes.find((l) => l.mda === node.mda);
      const cx = (p?.x ?? 0) + NODE_W / 2;
      expect(cx).toBeGreaterThanOrEqual(lane?.x0 ?? 0);
      expect(cx).toBeLessThan(lane?.x1 ?? 0);
    }
  });

  it('widens a lane that has many nodes and never overlaps cards', () => {
    const nodes = make(30, 'mechanics');
    const { geometry, positions } = layoutMda(nodes);
    const first = geometry.lanes[0];
    expect((first?.x1 ?? 0) - (first?.x0 ?? 0)).toBeGreaterThan(900);
    const list = nodes.map((n) => positions[n.id]);
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

  it('keeps a dragged position inside its lane and drops it outside', () => {
    const [node] = make(1, 'dynamics');
    if (!node) throw new Error('setup');
    const { geometry } = layoutMda([node]);
    const lane = geometry.lanes[1];
    const inside = { x: (lane?.x0 ?? 0) + 60, y: 50 };
    expect(layoutMda([node], { [node.id]: inside }).positions[node.id]).toEqual(inside);
    const outside = { x: -500, y: 50 };
    expect(layoutMda([node], { [node.id]: outside }).positions[node.id]).not.toEqual(outside);
  });
});

describe('classifyMda', () => {
  const { geometry } = layoutMda([]);
  const at = (x: number, y = 100) => ({ x: x - NODE_W / 2, y: y - NODE_H / 2 });

  it('finds the lane for a drop point', () => {
    const [a, b, c] = geometry.lanes;
    expect(classifyMda(at((a?.x0 ?? 0) + 10), geometry)).toBe('mechanics');
    expect(classifyMda(at((b?.x0 ?? 0) + 10), geometry)).toBe('dynamics');
    expect(classifyMda(at((c?.x0 ?? 0) + 10), geometry)).toBe('aesthetics');
  });

  it('clamps points outside the lanes to the nearest end', () => {
    expect(classifyMda(at(-900), geometry)).toBe('mechanics');
    expect(classifyMda(at(99999), geometry)).toBe('aesthetics');
  });
});
