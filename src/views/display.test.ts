import { describe, expect, it } from 'vitest';
import { createNode } from '../model/factory';
import type { GameEdge, GameNode, NodeKind } from '../model/types';
import { computeDisplay, matchesFilter, type DisplayInput } from './display';

const node = (kind: NodeKind, overrides: Partial<GameNode> = {}) =>
  createNode(kind, { x: 0, y: 0 }, [], overrides);

const base = (nodes: GameNode[], edges: GameEdge[] = []): DisplayInput => ({
  nodes,
  edges,
  view: 'graph',
  pathStep: null,
  filter: { statuses: [], tag: null },
  coreOnly: false,
  selectedNodeIds: [],
  onionHeuristic: true,
});

describe('computeDisplay', () => {
  it('dims nothing by default', () => {
    const d = computeDisplay(base([node('mechanic'), node('narrative')]));
    expect(d.dimmed.size).toBe(0);
    expect(d.deferred.size).toBe(0);
  });

  it('core-only mode defers and dims layers 1 to 3 only', () => {
    const core = node('mechanic');
    const secondary = node('mechanic', { layer: 1 });
    const story = node('narrative');
    const pillar = node('pillar');
    const d = computeDisplay({ ...base([core, secondary, story, pillar]), coreOnly: true });
    expect([...d.deferred].sort()).toEqual([secondary.id, story.id].sort());
    expect(d.dimmed.has(core.id)).toBe(false);
    expect(d.dimmed.has(pillar.id)).toBe(false);
  });

  it('narrows to a design path step', () => {
    const persona = node('persona');
    const mech = node('mechanic');
    const d = computeDisplay({ ...base([persona, mech]), pathStep: 'personas' });
    expect(d.dimmed.has(persona.id)).toBe(false);
    expect(d.dimmed.has(mech.id)).toBe(true);
  });

  it('dims nodes that miss the status or tag filter', () => {
    const a = node('mechanic', { status: 'idea', tags: ['voice'] });
    const b = node('mechanic', { status: 'designed', tags: ['voice'] });
    const c = node('mechanic', { status: 'idea', tags: [] });
    const d = computeDisplay({ ...base([a, b, c]), filter: { statuses: ['idea'], tag: 'voice' } });
    expect(d.dimmed.has(a.id)).toBe(false);
    expect(d.dimmed.has(b.id)).toBe(true);
    expect(d.dimmed.has(c.id)).toBe(true);
  });

  it('in the MDA view, dims everything outside the chain of the selection', () => {
    const mech = node('mechanic');
    const dyn = node('dynamic');
    const stray = node('mechanic');
    const edge: GameEdge = { id: 'e', kind: 'leadsTo', source: mech.id, target: dyn.id };
    const input = { ...base([mech, dyn, stray], [edge]), view: 'mda' as const };
    const d = computeDisplay({ ...input, selectedNodeIds: [dyn.id] });
    expect(d.dimmed.has(stray.id)).toBe(true);
    expect(d.dimmed.has(mech.id)).toBe(false);
    expect(d.chain?.edges.has('e')).toBe(true);
  });

  it('does not fade anything when the selection has no chain', () => {
    const a = node('mechanic');
    const b = node('mechanic');
    const d = computeDisplay({ ...base([a, b]), view: 'mda', selectedNodeIds: [a.id] });
    expect(d.dimmed.size).toBe(0);
    expect(d.chain).toBeNull();
  });

  it('marks requires edges that reach outwards in the Onion view', () => {
    const core = node('mechanic');
    const story = node('narrative');
    const outward: GameEdge = { id: 'bad', kind: 'requires', source: core.id, target: story.id };
    const inward: GameEdge = { id: 'ok', kind: 'requires', source: story.id, target: core.id };
    const input = { ...base([core, story], [outward, inward]), view: 'onion' as const };
    expect([...computeDisplay(input).warnEdges]).toEqual(['bad']);
    expect(computeDisplay({ ...input, onionHeuristic: false }).warnEdges.size).toBe(0);
    expect(computeDisplay({ ...input, view: 'graph' }).warnEdges.size).toBe(0);
  });
});

describe('matchesFilter', () => {
  it('lets everything through when no filter is set', () => {
    expect(matchesFilter({ statuses: [], tag: null }, node('note'))).toBe(true);
  });
});
