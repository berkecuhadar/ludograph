import { describe, expect, it } from 'vitest';
import { allowedEdgeKinds, checkEdge, explainNoEdge, kindGroup } from './edgeRules';
import { createNode } from './factory';
import type { CustomKind, GameEdge, NodeKind } from './types';

const node = (kind: NodeKind, customKinds: CustomKind[] = []) =>
  createNode(kind, { x: 0, y: 0 }, customKinds);

describe('kindGroup', () => {
  it('groups the built-in kinds', () => {
    expect(kindGroup(node('pillar'), [])).toBe('pillar');
    expect(kindGroup(node('dynamic'), [])).toBe('dynamic');
    expect(kindGroup(node('narrative'), [])).toBe('mechanic');
    expect(kindGroup(node('resource'), [])).toBe('mechanic');
  });

  it('groups custom kinds by their MDA axis', () => {
    const custom: CustomKind[] = [
      { id: 'vibe', name: 'Vibe', color: '#000', icon: 'circle', mda: 'aesthetics' },
    ];
    expect(kindGroup(node('custom:vibe', custom), custom)).toBe('aesthetic');
    expect(kindGroup(node('custom:gone', custom), custom)).toBe('mechanic');
  });
});

describe('checkEdge', () => {
  it('allows the mechanic to dynamic to aesthetic chain', () => {
    expect(checkEdge('leadsTo', node('mechanic'), node('dynamic'), [], []).ok).toBe(true);
    expect(checkEdge('leadsTo', node('dynamic'), node('aesthetic'), [], []).ok).toBe(true);
    expect(checkEdge('leadsTo', node('mechanic'), node('aesthetic'), [], []).ok).toBe(true);
  });

  it('rejects leadsTo that starts at an aesthetic, with a readable reason', () => {
    const result = checkEdge('leadsTo', node('aesthetic'), node('mechanic'), [], []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Leads to');
      expect(result.reason).toContain('aesthetic');
      expect(result.reason).toContain('mechanics, dynamics');
    }
  });

  it('only lets serves end at a pillar or an aesthetic', () => {
    expect(checkEdge('serves', node('persona'), node('aesthetic'), [], []).ok).toBe(true);
    expect(checkEdge('serves', node('mechanic'), node('pillar'), [], []).ok).toBe(true);
    expect(checkEdge('serves', node('mechanic'), node('mechanic'), [], []).ok).toBe(false);
  });

  it('keeps flow kinds between mechanics nodes', () => {
    for (const kind of ['feeds', 'requires', 'unlocks', 'triggers', 'modifies'] as const) {
      expect(checkEdge(kind, node('state'), node('action'), [], []).ok).toBe(true);
      expect(checkEdge(kind, node('pillar'), node('action'), [], []).ok).toBe(false);
    }
  });

  it('rejects self loops', () => {
    const a = node('mechanic');
    expect(checkEdge('feeds', a, a, [], []).ok).toBe(false);
  });

  it('rejects an identical edge but not when it is the edge being edited', () => {
    const a = node('mechanic');
    const b = node('mechanic');
    const edge: GameEdge = { id: 'e1', kind: 'feeds', source: a.id, target: b.id };
    expect(checkEdge('feeds', a, b, [], [edge]).ok).toBe(false);
    expect(checkEdge('feeds', a, b, [], [edge], 'e1').ok).toBe(true);
    expect(checkEdge('requires', a, b, [], [edge]).ok).toBe(true);
  });
});

describe('allowedEdgeKinds and explainNoEdge', () => {
  it('lists every kind that fits a pair', () => {
    const kinds = allowedEdgeKinds(node('mechanic'), node('dynamic'), [], []);
    expect(kinds).toEqual(['conflicts', 'leadsTo']);
  });

  it('is empty when nothing fits, and says why', () => {
    const a = node('note');
    const b = node('mechanic');
    expect(allowedEdgeKinds(a, b, [], [])).toEqual([]);
    expect(explainNoEdge(a, b, [])).toContain('No edge kind');
  });
});
