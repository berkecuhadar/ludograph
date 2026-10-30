import { describe, expect, it } from 'vitest';
import { createGraph, createNode, createProject } from '../model/factory';
import { runValidation } from './index';
import { DEFAULT_TEST_SETTINGS } from './testkit';

describe('runValidation', () => {
  it('returns nothing for an empty project', () => {
    expect(runValidation(createProject(), DEFAULT_TEST_SETTINGS)).toEqual([]);
  });

  it('checks every graph and tells which one a finding is in', () => {
    const project = createProject();
    const inner = createGraph('Inside');
    const mech = createNode('mechanic', { x: 0, y: 0 });
    inner.nodes.push(mech);
    project.graphs[inner.id] = inner;
    const issues = runValidation(project, DEFAULT_TEST_SETTINGS);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.graphId === inner.id)).toBe(true);
  });

  it('puts errors before warnings before notes, and keeps ids unique', () => {
    const project = createProject();
    const graph = project.graphs[project.rootGraphId];
    if (!graph) throw new Error('setup');
    const a = createNode('mechanic', { x: 0, y: 0 }, [], { title: 'A' });
    const b = createNode('mechanic', { x: 0, y: 0 }, [], { title: 'B' });
    graph.nodes.push(a, b, createNode('note', { x: 0, y: 0 }));
    graph.edges.push(
      { id: 'e1', kind: 'requires', source: a.id, target: b.id },
      { id: 'e2', kind: 'requires', source: b.id, target: a.id },
    );
    const issues = runValidation(project, DEFAULT_TEST_SETTINGS);
    const order = { error: 0, warning: 1, info: 2 };
    const ranks = issues.map((i) => order[i.severity]);
    expect(ranks).toEqual([...ranks].sort((x, y) => x - y));
    expect(issues[0]?.severity).toBe('error');
    expect(new Set(issues.map((i) => i.id)).size).toBe(issues.length);
  });
});
