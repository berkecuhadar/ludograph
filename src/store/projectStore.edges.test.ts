import { beforeEach, describe, expect, it } from 'vitest';
import { graphPath } from '../model/graphOps';
import { createProject } from '../model/factory';
import { useProjectStore } from './projectStore';

const store = () => useProjectStore.getState();
const graph = () => {
  const { project, activeGraphId } = store();
  const g = project.graphs[activeGraphId];
  if (!g) throw new Error('no active graph');
  return g;
};

beforeEach(() => {
  store().loadProject(createProject('test'));
});

describe('connectNodes', () => {
  it('adds an allowed edge', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 });
    const b = store().addNode('dynamic', { x: 100, y: 0 });
    const result = store().connectNodes(a, b, 'leadsTo');
    expect(result.ok).toBe(true);
    expect(graph().edges).toHaveLength(1);
    expect(graph().edges[0]).toMatchObject({ kind: 'leadsTo', source: a, target: b });
  });

  it('refuses a pair the rules do not allow and keeps the graph as it was', () => {
    const a = store().addNode('pillar', { x: 0, y: 0 });
    const b = store().addNode('mechanic', { x: 100, y: 0 });
    const result = store().connectNodes(a, b, 'feeds');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(10);
    expect(graph().edges).toHaveLength(0);
  });

  it('refuses a duplicate', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 });
    const b = store().addNode('mechanic', { x: 100, y: 0 });
    expect(store().connectNodes(a, b, 'feeds').ok).toBe(true);
    expect(store().connectNodes(a, b, 'feeds').ok).toBe(false);
    expect(store().connectNodes(a, b, 'requires').ok).toBe(true);
  });
});

describe('setEdgeKind', () => {
  it('changes the kind when allowed and refuses otherwise', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 });
    const b = store().addNode('mechanic', { x: 100, y: 0 });
    const result = store().connectNodes(a, b, 'feeds');
    if (!result.ok) throw new Error('setup failed');
    expect(store().setEdgeKind(result.id, 'requires').ok).toBe(true);
    expect(graph().edges[0]?.kind).toBe('requires');
    expect(store().setEdgeKind(result.id, 'leadsTo').ok).toBe(false);
    expect(graph().edges[0]?.kind).toBe('requires');
  });
});

describe('custom kinds', () => {
  it('adds a kind with a unique id and lets nodes use it', () => {
    const first = store().addCustomKind({
      name: 'Card',
      color: '#aa0000',
      icon: 'square',
      mda: 'mechanics',
    });
    const second = store().addCustomKind({
      name: 'Card',
      color: '#00aa00',
      icon: 'circle',
      mda: 'mechanics',
    });
    expect(first).toBe('card');
    expect(second).toBe('card-2');
    const id = store().addNode('custom:card', { x: 0, y: 0 });
    expect(graph().nodes.find((n) => n.id === id)?.title).toBe('Card');
  });

  it('starts a node on the kind default layer', () => {
    store().addCustomKind({
      name: 'Spell',
      color: '#0000aa',
      icon: 'star',
      mda: 'mechanics',
      layer: 1,
    });
    const id = store().addNode('custom:spell', { x: 0, y: 0 });
    expect(graph().nodes.find((n) => n.id === id)?.layer).toBe(1);
  });

  it('updates and removes a kind', () => {
    const id = store().addCustomKind({
      name: 'Card',
      color: '#aa0000',
      icon: 'square',
      mda: 'mechanics',
      layer: 1,
    });
    store().updateCustomKind(id, { name: 'Deck card', layer: undefined });
    const kind = store().project.customKinds[0];
    expect(kind?.name).toBe('Deck card');
    expect('layer' in (kind ?? {})).toBe(false);
    store().removeCustomKind(id);
    expect(store().project.customKinds).toHaveLength(0);
  });
});

describe('drill-down', () => {
  it('creates the inner graph on first open and reuses it later', () => {
    const rootId = store().activeGraphId;
    const id = store().addNode('mechanic', { x: 0, y: 0 }, { title: 'Voting' });
    store().openNode(id);
    const innerId = store().activeGraphId;
    expect(innerId).not.toBe(rootId);
    expect(store().project.graphs[innerId]?.parentNodeId).toBe(id);
    expect(store().project.graphs[rootId]?.nodes[0]?.childGraphId).toBe(innerId);

    store().setActiveGraph(rootId);
    store().openNode(id);
    expect(store().activeGraphId).toBe(innerId);
    expect(Object.keys(store().project.graphs)).toHaveLength(2);
  });

  it('builds the breadcrumb path from the root down', () => {
    const id = store().addNode('mechanic', { x: 0, y: 0 }, { title: 'Voting' });
    store().openNode(id);
    const innerNode = store().addNode('action', { x: 0, y: 0 }, { title: 'Cast vote' });
    store().openNode(innerNode);
    const path = graphPath(store().project, store().activeGraphId);
    expect(path.map((p) => p.label)).toEqual(['Main', 'Voting', 'Cast vote']);
  });

  it('deletes the inner graphs together with the node', () => {
    const rootId = store().activeGraphId;
    const id = store().addNode('mechanic', { x: 0, y: 0 });
    store().openNode(id);
    store().addNode('action', { x: 0, y: 0 });
    store().setActiveGraph(rootId);
    store().removeNodes([id]);
    expect(Object.keys(store().project.graphs)).toEqual([rootId]);
  });

  it('goes back to the root when undo removes the graph being viewed', () => {
    const rootId = store().activeGraphId;
    const id = store().addNode('mechanic', { x: 0, y: 0 });
    store().openNode(id);
    store().undo();
    expect(store().activeGraphId).toBe(rootId);
    expect(store().project.graphs[rootId]?.nodes[0]?.childGraphId).toBeUndefined();
  });

  it('keeps the inner graph out of a duplicate', () => {
    const id = store().addNode('mechanic', { x: 0, y: 0 });
    store().openNode(id);
    store().setActiveGraph(store().project.rootGraphId);
    const [copy] = store().duplicateNodes([id]);
    expect(graph().nodes.find((n) => n.id === copy)?.childGraphId).toBeUndefined();
  });
});
