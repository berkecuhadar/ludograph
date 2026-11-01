import { describe, expect, it } from 'vitest';
import { createProject } from '../model/factory';
import { applyBatch } from './batch';

const fresh = () => createProject('test');

describe('applyBatch', () => {
  it('adds nodes with kind defaults and a grid position', () => {
    const r = applyBatch(fresh(), {
      nodes: [
        { id: 'a', kind: 'mechanic', title: 'Jump' },
        { id: 'b', kind: 'aesthetic', title: 'Flow' },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const nodes = Object.values(r.project.graphs)[0]!.nodes;
    expect(nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(nodes[0]).toMatchObject({ mda: 'mechanics', layer: 0, status: 'idea' });
    expect(nodes[1]!.position.x).toBeGreaterThan(nodes[0]!.position.x);
    expect(nodes[1]!.layer).toBeUndefined();
  });

  it('updates an existing id and can clear an optional field with null', () => {
    const first = applyBatch(fresh(), {
      nodes: [{ id: 'a', kind: 'mechanic', title: 'Jump', layer: 1, params: { power: 3 } }],
    });
    if (!first.ok) throw new Error('setup');
    const r = applyBatch(first.project, {
      nodes: [{ id: 'a', description: 'Hop.', layer: null }],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.updatedNodes).toHaveLength(1);
    const node = Object.values(r.project.graphs)[0]!.nodes[0]!;
    expect(node.layer).toBeUndefined();
    expect(node.description).toBe('Hop.');
    expect(node.title).toBe('Jump');
    expect(node.params).toEqual([{ key: 'power', value: 3 }]);
  });

  it('connects nodes by title and skips an edge that exists', () => {
    const batch = {
      nodes: [
        { id: 'a', kind: 'mechanic' as const, title: 'Jump' },
        { id: 'b', kind: 'mechanic' as const, title: 'Land' },
      ],
      edges: [{ kind: 'triggers' as const, from: 'Jump', to: 'b' }],
    };
    const first = applyBatch(fresh(), batch);
    if (!first.ok) throw new Error('setup');
    expect(first.addedEdges).toBe(1);
    const again = applyBatch(first.project, { edges: batch.edges });
    expect(again.ok && again.skippedEdges).toBe(1);
  });

  it('refuses an edge the rules forbid', () => {
    const r = applyBatch(fresh(), {
      nodes: [
        { id: 'a', kind: 'mechanic', title: 'Jump' },
        { id: 'b', kind: 'aesthetic', title: 'Flow' },
      ],
      edges: [{ kind: 'requires', from: 'a', to: 'b' }],
    });
    expect(r.ok).toBe(false);
  });

  it('reports unknown fields and missing nodes together', () => {
    const r = applyBatch(fresh(), {
      nodes: [
        { id: 'a', kind: 'mechanic', title: 'Jump', colour: 'red' } as never,
        { id: 'b', kind: 'mechanic', title: 'Land' },
      ],
      edges: [{ kind: 'feeds', from: 'b', to: 'ghost' }],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.join('\n')).toContain('unknown field "colour"');
    expect(r.errors.join('\n')).toContain('ghost');
  });

  it('rejects a bad value through the file reader', () => {
    const r = applyBatch(fresh(), {
      nodes: [{ id: 'b', kind: 'mechanic', title: 'Land', status: 'done' as never }],
    });
    expect(r.ok).toBe(false);
  });

  it('puts a node inside a parent and refuses edges across graphs', () => {
    const r = applyBatch(fresh(), {
      nodes: [
        { id: 'p', kind: 'mechanic', title: 'Combat' },
        { id: 'c', kind: 'subMechanic', title: 'Block', parent: 'Combat' },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.project.graphs)).toHaveLength(2);
    const across = applyBatch(r.project, { edges: [{ kind: 'feeds', from: 'p', to: 'c' }] });
    expect(across.ok).toBe(false);
  });
});
