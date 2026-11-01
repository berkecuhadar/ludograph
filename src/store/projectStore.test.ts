import { beforeEach, describe, expect, it } from 'vitest';
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

describe('nodes', () => {
  it('adds a node with the defaults of its kind', () => {
    const id = store().addNode('narrative', { x: 10, y: 20 });
    const node = graph().nodes.find((n) => n.id === id);
    expect(node?.layer).toBe(3);
    expect(node?.mda).toBe('mechanics');
    expect(node?.status).toBe('idea');
    expect(node?.position).toEqual({ x: 10, y: 20 });
  });

  it('can start a node on another layer (secondary mechanic)', () => {
    const id = store().addNode('mechanic', { x: 0, y: 0 }, { layer: 1 });
    expect(graph().nodes.find((n) => n.id === id)?.layer).toBe(1);
  });

  it('never lets a patch change the id', () => {
    const id = store().addNode('note', { x: 0, y: 0 });
    store().updateNode(id, { id: 'other', title: 'Hello' });
    expect(graph().nodes[0]?.id).toBe(id);
    expect(graph().nodes[0]?.title).toBe('Hello');
  });

  it('clears an optional field when it is patched with undefined', () => {
    const id = store().addNode('mechanic', { x: 0, y: 0 });
    store().updateNode(id, { layer: undefined });
    expect('layer' in (graph().nodes[0] ?? {})).toBe(false);
    store().undo();
    expect(graph().nodes[0]?.layer).toBe(0);
  });

  it('removes a node together with its edges', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 });
    const b = store().addNode('dynamic', { x: 100, y: 0 });
    const c = store().addNode('aesthetic', { x: 200, y: 0 });
    store().addEdge({ kind: 'leadsTo', source: a, target: b });
    store().addEdge({ kind: 'leadsTo', source: b, target: c });
    store().removeNodes([b]);
    expect(graph().nodes.map((n) => n.id)).toEqual([a, c]);
    expect(graph().edges).toHaveLength(0);
  });
});

describe('duplicate, copy and paste', () => {
  it('duplicates nodes and the edges between them, with new ids', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 });
    const b = store().addNode('dynamic', { x: 100, y: 0 });
    store().addEdge({ kind: 'leadsTo', source: a, target: b });
    const created = store().duplicateNodes([a, b]);
    expect(created).toHaveLength(2);
    expect(graph().nodes).toHaveLength(4);
    expect(graph().edges).toHaveLength(2);
    const copyEdge = graph().edges[1];
    expect(created).toContain(copyEdge?.source);
    expect(created).toContain(copyEdge?.target);
  });

  it('leaves out edges that point outside the selection', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 });
    const b = store().addNode('dynamic', { x: 100, y: 0 });
    store().addEdge({ kind: 'leadsTo', source: a, target: b });
    store().duplicateNodes([a]);
    expect(graph().edges).toHaveLength(1);
  });

  it('does not copy the inner graph reference', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 }, { childGraphId: 'g_inner' });
    const [copyId] = store().duplicateNodes([a]);
    expect(graph().nodes.find((n) => n.id === copyId)?.childGraphId).toBeUndefined();
  });

  it('pastes the copied nodes and moves each paste a bit', () => {
    const a = store().addNode('mechanic', { x: 0, y: 0 });
    store().copyNodes([a]);
    const [first] = store().paste();
    const [second] = store().paste();
    const pos = (id?: string) => graph().nodes.find((n) => n.id === id)?.position;
    expect(pos(first)).toEqual({ x: 32, y: 32 });
    expect(pos(second)).toEqual({ x: 64, y: 64 });
  });

  it('paste does nothing without a clipboard', () => {
    expect(store().paste()).toEqual([]);
  });
});

describe('undo and redo', () => {
  it('undoes and redoes an add', () => {
    store().addNode('mechanic', { x: 0, y: 0 });
    store().undo();
    expect(graph().nodes).toHaveLength(0);
    store().redo();
    expect(graph().nodes).toHaveLength(1);
  });

  it('drops the redo stack after a new edit', () => {
    store().addNode('mechanic', { x: 0, y: 0 });
    store().undo();
    store().addNode('note', { x: 0, y: 0 });
    expect(store().future).toHaveLength(0);
  });

  it('merges a drag into one undo step', () => {
    const id = store().addNode('mechanic', { x: 0, y: 0 });
    const before = store().past.length;
    store().moveNodes({ [id]: { x: 5, y: 5 } });
    store().moveNodes({ [id]: { x: 10, y: 10 } });
    store().moveNodes({ [id]: { x: 15, y: 15 } });
    expect(store().past.length).toBe(before + 1);
    store().undo();
    expect(graph().nodes[0]?.position).toEqual({ x: 0, y: 0 });
  });

  it('merges typing edits that share a key', () => {
    const id = store().addNode('note', { x: 0, y: 0 });
    const before = store().past.length;
    store().updateNode(id, { title: 'A' }, { coalesce: 'title' });
    store().updateNode(id, { title: 'AB' }, { coalesce: 'title' });
    expect(store().past.length).toBe(before + 1);
  });

  it('does not merge edits with different keys', () => {
    const id = store().addNode('note', { x: 0, y: 0 });
    const before = store().past.length;
    store().updateNode(id, { title: 'A' }, { coalesce: 'title' });
    store().updateNode(id, { description: 'x' }, { coalesce: 'description' });
    expect(store().past.length).toBe(before + 2);
  });

  it('undo and redo are no-ops on empty stacks', () => {
    store().undo();
    store().redo();
    expect(graph().nodes).toHaveLength(0);
  });

  it('loading a project clears the history', () => {
    store().addNode('note', { x: 0, y: 0 });
    store().loadProject(createProject('other'));
    expect(store().past).toHaveLength(0);
    expect(store().future).toHaveLength(0);
  });
});

describe('applyBatch', () => {
  it('adds a batch as one undo step', () => {
    const result = store().applyBatch({
      nodes: [
        { id: 'a', kind: 'mechanic', title: 'Jump' },
        { id: 'b', kind: 'mechanic', title: 'Land' },
      ],
      edges: [{ kind: 'triggers', from: 'a', to: 'b' }],
    });
    expect(result.ok).toBe(true);
    expect(graph().nodes).toHaveLength(2);
    expect(graph().edges).toHaveLength(1);
    store().undo();
    expect(graph().nodes).toHaveLength(0);
  });

  it('leaves the project alone when the batch is wrong', () => {
    const before = store().project;
    const result = store().applyBatch({ edges: [{ kind: 'feeds', from: 'x', to: 'y' }] });
    expect(result.ok).toBe(false);
    expect(store().project).toBe(before);
    expect(store().past).toHaveLength(0);
  });
});
