import { describe, expect, it } from 'vitest';
import { createNode, createProject } from './factory';
import { parseProject, parseProjectText } from './schema';
import type { Project } from './types';

function sample(): Project {
  const project = createProject('Sample');
  const graph = project.graphs[project.rootGraphId];
  if (!graph) throw new Error('setup');
  const a = createNode('mechanic', { x: 1, y: 2 }, [], {
    title: 'Vote',
    params: [{ key: 'n', value: 3 }],
  });
  const b = createNode('persona', { x: 5, y: 6 }, [], { ocean: { o: 10, c: 20 } });
  graph.nodes.push(a, b);
  graph.edges.push({ id: 'e1', kind: 'feeds', source: a.id, target: b.id, label: 'x' });
  project.customKinds.push({
    id: 'card',
    name: 'Card',
    color: '#fff',
    icon: 'square',
    mda: 'mechanics',
  });
  return project;
}

const roundTrip = (p: Project) => parseProject(JSON.parse(JSON.stringify(p)));

describe('parseProject', () => {
  it('accepts what it saved, unchanged', () => {
    const project = sample();
    const result = roundTrip(project);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.project).toEqual(project);
  });

  it('keeps view positions and the core-only flag', () => {
    const project = {
      ...sample(),
      coreOnly: true,
      viewPositions: { onion: { n_1: { x: 1, y: 2 } } },
    };
    const result = roundTrip(project);
    expect(result.ok && result.project.coreOnly).toBe(true);
    expect(result.ok && result.project.viewPositions?.onion?.n_1).toEqual({ x: 1, y: 2 });
  });

  it('rejects things that are not a project', () => {
    for (const value of [null, 5, 'text', [], {}]) {
      expect(parseProject(value).ok).toBe(false);
    }
  });

  it('says so when the schema version is not supported', () => {
    const result = parseProject({ ...sample(), schemaVersion: 2 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('schemaVersion');
  });

  it('points at the exact place of a bad value', () => {
    const project = sample();
    const raw = JSON.parse(JSON.stringify(project));
    const graphId = project.rootGraphId;
    raw.graphs[graphId].nodes[0].kind = 'banana';
    raw.graphs[graphId].nodes[1].status = 'done';
    const result = parseProject(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join('\n')).toContain(`graphs.${graphId}.nodes[0].kind`);
      expect(result.errors.join('\n')).toContain('banana');
      expect(result.errors.join('\n')).toContain(`graphs.${graphId}.nodes[1].status`);
    }
  });

  it('checks that edges point at nodes of the same graph', () => {
    const raw = JSON.parse(JSON.stringify(sample()));
    const graph = raw.graphs[raw.rootGraphId];
    graph.edges[0].target = 'ghost';
    const result = parseProject(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('ghost');
  });

  it('checks the root graph, inner graph links and duplicate ids', () => {
    const base = JSON.parse(JSON.stringify(sample()));
    expect(parseProject({ ...base, rootGraphId: 'nope' }).ok).toBe(false);

    const withChild = JSON.parse(JSON.stringify(sample()));
    withChild.graphs[withChild.rootGraphId].nodes[0].childGraphId = 'missing';
    expect(parseProject(withChild).ok).toBe(false);

    const dup = JSON.parse(JSON.stringify(sample()));
    const nodes = dup.graphs[dup.rootGraphId].nodes;
    nodes[1].id = nodes[0].id;
    const result = parseProject(dup);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toContain('used twice');
  });

  it('checks ranges and types of optional fields', () => {
    const raw = JSON.parse(JSON.stringify(sample()));
    const node = raw.graphs[raw.rootGraphId].nodes[1];
    node.ocean.o = 500;
    node.layer = 7;
    node.params = [{ key: 'x', value: { nested: true } }];
    const result = parseProject(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.errors.join('\n');
      expect(text).toContain('ocean.o');
      expect(text).toContain('layer');
      expect(text).toContain('params[0].value');
    }
  });

  it('limits the number of errors it lists', () => {
    const raw = JSON.parse(JSON.stringify(sample()));
    const graph = raw.graphs[raw.rootGraphId];
    graph.nodes = Array.from({ length: 40 }, (_, i) => ({ id: `n${i}` }));
    const result = parseProject(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeLessThanOrEqual(26);
      expect(result.errors[result.errors.length - 1]).toContain('more');
    }
  });

  it('accepts custom kinds on nodes and fills in a missing description', () => {
    const raw = JSON.parse(JSON.stringify(sample()));
    const node = raw.graphs[raw.rootGraphId].nodes[0];
    node.kind = 'custom:card';
    delete node.description;
    const result = parseProject(raw);
    expect(result.ok && result.project.graphs[raw.rootGraphId]?.nodes[0]?.description).toBe('');
  });
});

describe('parseProjectText', () => {
  it('explains broken JSON in plain words', () => {
    const result = parseProjectText('{ not json');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toContain('not valid JSON');
  });

  it('parses valid text', () => {
    expect(parseProjectText(JSON.stringify(sample())).ok).toBe(true);
  });
});
