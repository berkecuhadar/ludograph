import { describe, expect, it } from 'vitest';
import type { GameEdge } from '../model/types';
import { leadsToChain } from './chains';

const edge = (id: string, source: string, target: string, kind: GameEdge['kind'] = 'leadsTo') =>
  ({ id, source, target, kind }) satisfies GameEdge;

const edges = [
  edge('e1', 'vote', 'accuse'),
  edge('e2', 'speak', 'accuse'),
  edge('e3', 'accuse', 'paranoia'),
  edge('e4', 'other', 'unrelated'),
  edge('e5', 'vote', 'speak', 'requires'),
];

describe('leadsToChain', () => {
  it('walks back from an aesthetic to the mechanics that lead to it', () => {
    const chain = leadsToChain(edges, ['paranoia']);
    expect([...chain.nodes].sort()).toEqual(['accuse', 'paranoia', 'speak', 'vote']);
    expect([...chain.edges].sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('walks forward from a mechanic', () => {
    const chain = leadsToChain(edges, ['vote']);
    expect([...chain.nodes].sort()).toEqual(['accuse', 'paranoia', 'vote']);
  });

  it('ignores other edge kinds and unrelated chains', () => {
    const chain = leadsToChain(edges, ['vote']);
    expect(chain.nodes.has('speak')).toBe(false);
    expect(chain.nodes.has('unrelated')).toBe(false);
  });

  it('is just the selection when nothing leads anywhere', () => {
    const chain = leadsToChain(edges, ['lonely']);
    expect([...chain.nodes]).toEqual(['lonely']);
    expect(chain.edges.size).toBe(0);
  });

  it('survives cycles', () => {
    const loop = [edge('a', 'x', 'y'), edge('b', 'y', 'x')];
    expect([...leadsToChain(loop, ['x']).nodes].sort()).toEqual(['x', 'y']);
  });
});
