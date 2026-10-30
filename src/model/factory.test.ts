import { describe, expect, it } from 'vitest';
import { createGraph, createNode, createProject } from './factory';

describe('createProject', () => {
  it('starts with one root graph', () => {
    const project = createProject('My game');
    expect(project.schemaVersion).toBe(1);
    expect(project.name).toBe('My game');
    expect(Object.keys(project.graphs)).toEqual([project.rootGraphId]);
    expect(project.designOrder).toBe('outsideIn');
  });

  it('gives each project its own ids', () => {
    expect(createProject().id).not.toBe(createProject().id);
  });
});

describe('createNode', () => {
  it('omits layer for kinds outside the onion', () => {
    const node = createNode('pillar', { x: 0, y: 0 });
    expect('layer' in node).toBe(false);
  });

  it('lets overrides win over defaults', () => {
    const node = createNode('mechanic', { x: 0, y: 0 }, [], { layer: 1, title: 'Boosters' });
    expect(node.layer).toBe(1);
    expect(node.title).toBe('Boosters');
  });
});

describe('createGraph', () => {
  it('only sets parentNodeId when given', () => {
    expect('parentNodeId' in createGraph('a')).toBe(false);
    expect(createGraph('b', 'n_1').parentNodeId).toBe('n_1');
  });
});
