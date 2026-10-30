import { describe, expect, it } from 'vitest';
import { createGraph, createNode, createProject } from '../model/factory';
import { exportUnityJson, toUnity } from './unity';

function sample() {
  const project = createProject('Sample game');
  const root = project.graphs[project.rootGraphId];
  if (!root) throw new Error('setup');
  const vote = createNode('action', { x: 10, y: 20 }, [], {
    title: 'Vote',
    params: [
      { key: 'seconds', value: 30 },
      { key: 'anonymous', value: true },
      { key: 'mode', value: 'secret' },
    ],
  });
  const story = createNode('narrative', { x: 0, y: 0 }, [], {
    title: 'Trial',
    contentCost: 'low',
    prototypeScope: 'stub',
  });
  const persona = createNode('persona', { x: 0, y: 0 }, [], { ocean: { o: 70, n: 20 } });
  const inner = createGraph('Voting', vote.id);
  const step = createNode('state', { x: 0, y: 0 }, [], { title: 'Count' });
  inner.nodes.push(step);
  vote.childGraphId = inner.id;
  project.graphs[inner.id] = inner;
  root.nodes.push(vote, story, persona);
  root.edges.push({
    id: 'e1',
    kind: 'feeds',
    source: vote.id,
    target: story.id,
    label: '2 per round',
  });
  inner.edges.push();
  return { project, vote, story, persona, inner, step };
}

describe('toUnity', () => {
  it('flattens all graphs into one list of nodes and edges, keeping ids', () => {
    const { project, vote, step, inner } = sample();
    const data = toUnity(project);
    expect(data.nodes.map((n) => n.id)).toEqual(expect.arrayContaining([vote.id, step.id]));
    expect(data.nodes.find((n) => n.id === step.id)?.graphId).toBe(inner.id);
    expect(data.graphs).toHaveLength(2);
    expect(data.graphs.find((g) => g.id === inner.id)?.parentNodeId).toBe(vote.id);
    expect(data.edges).toEqual([
      {
        id: 'e1',
        graphId: project.rootGraphId,
        kind: 'feeds',
        source: vote.id,
        target: data.nodes[1]?.id,
        label: '2 per round',
      },
    ]);
  });

  it('includes mda, layer and prototype scope, using -1 and empty text for nothing', () => {
    const { project, vote, story, persona } = sample();
    const nodes = toUnity(project).nodes;
    const byId = (id: string) => nodes.find((n) => n.id === id);
    expect(byId(vote.id)).toMatchObject({ mda: 'mechanics', layer: 0, prototypeScope: '' });
    expect(byId(story.id)).toMatchObject({ layer: 3, prototypeScope: 'stub', contentCost: 'low' });
    expect(byId(persona.id)).toMatchObject({
      layer: -1,
      mda: 'aesthetics',
      oceanO: 70,
      oceanC: -1,
      oceanN: 20,
    });
  });

  it('turns parameter values into text with a type tag', () => {
    const { project, vote } = sample();
    const params = toUnity(project).nodes.find((n) => n.id === vote.id)?.params;
    expect(params).toEqual([
      { key: 'seconds', value: '30', valueType: 'number' },
      { key: 'anonymous', value: 'true', valueType: 'boolean' },
      { key: 'mode', value: 'secret', valueType: 'string' },
    ]);
  });

  it('never produces null or undefined, which Unity cannot read', () => {
    const json = exportUnityJson(sample().project);
    expect(json).not.toContain('null');
    expect(
      JSON.parse(json).nodes.every((n: Record<string, unknown>) =>
        Object.values(n).every((v) => v !== undefined),
      ),
    ).toBe(true);
  });

  it('is stable: the same project gives the same text', () => {
    const { project } = sample();
    expect(exportUnityJson(project)).toBe(exportUnityJson(project));
  });
});
