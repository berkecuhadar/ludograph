import { describe, expect, it } from 'vitest';
import { createGraph, createNode, createProject } from '../model/factory';
import type { GameNode, Project } from '../model/types';
import { exportMarkdown } from './markdown';

function build(overrides: Partial<Project> = {}) {
  const project: Project = { ...createProject('Sample game'), ...overrides };
  const root = project.graphs[project.rootGraphId];
  if (!root) throw new Error('setup');
  const add = (node: GameNode) => {
    root.nodes.push(node);
    return node;
  };
  const make = (kind: Parameters<typeof createNode>[0], extra: Partial<GameNode> = {}) =>
    add(createNode(kind, { x: 0, y: 0 }, [], extra));
  return { project, root, make };
}

const at = (md: string, text: string) => md.indexOf(text);

describe('exportMarkdown', () => {
  it('starts with the project name and the working order', () => {
    const { project } = build();
    const md = exportMarkdown(project);
    expect(md.startsWith('# Sample game')).toBe(true);
    expect(md).toContain('Working order: outside-in.');
  });

  it('puts experience and personas first when working outside-in, then layers inwards', () => {
    const { project, make } = build();
    make('mechanic', { title: 'Core thing' });
    make('mechanic', { title: 'Meta thing', layer: 1 });
    make('progression', { title: 'Rep' });
    make('narrative', { title: 'Story' });
    make('aesthetic', { title: 'Fellowship' });
    make('persona', { title: 'Host' });
    const md = exportMarkdown(project);
    const order = [
      '## Experience',
      '## Personas',
      '## Narrative',
      '## Progression',
      '## Secondary',
      '## Core',
    ];
    const positions = order.map((h) => at(md, h));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('puts the core first when working core-first', () => {
    const { project, make } = build({ designOrder: 'coreFirst' });
    make('mechanic', { title: 'Core thing' });
    make('narrative', { title: 'Story' });
    make('aesthetic', { title: 'Fellowship' });
    const md = exportMarkdown(project);
    expect(at(md, '## Core')).toBeLessThan(at(md, '## Narrative'));
    expect(at(md, '## Narrative')).toBeLessThan(at(md, '## Experience'));
  });

  it('writes the description, a parameter table and the requires, feeds and conflicts lists', () => {
    const { project, root, make } = build();
    const vote = make('action', {
      title: 'Vote',
      description: 'Players pick who to accuse.',
      params: [
        { key: 'seconds', value: 30 },
        { key: 'note', value: 'a|b' },
      ],
    });
    const speak = make('action', { title: 'Speak' });
    const timer = make('state', { title: 'Timer' });
    const chaos = make('rule', { title: 'Chaos' });
    root.edges.push(
      { id: 'e1', kind: 'requires', source: vote.id, target: speak.id },
      { id: 'e2', kind: 'feeds', source: vote.id, target: timer.id },
      { id: 'e3', kind: 'conflicts', source: chaos.id, target: vote.id },
    );
    const md = exportMarkdown(project);
    expect(md).toContain('Players pick who to accuse.');
    expect(md).toContain('| seconds | 30 |');
    expect(md).toContain('| note | a\\|b |');
    expect(md).toContain('**Requires:** Speak');
    expect(md).toContain('**Feeds:** Timer');
    expect(md).toContain('**Conflicts with:** Chaos');
  });

  it('shows content cost on narrative nodes and the OCEAN table on personas', () => {
    const { project, make } = build();
    make('narrative', { title: 'Trial', contentCost: 'low' });
    make('persona', { title: 'Host', ocean: { o: 70, e: 90 } });
    const md = exportMarkdown(project);
    expect(md).toContain('Content cost: Low');
    expect(md).toContain('| Openness | 70 |');
    expect(md).toContain('| Extraversion | 90 |');
    expect(md).not.toContain('| Neuroticism |');
  });

  it('lists the mechanics that lead to each aesthetic', () => {
    const { project, root, make } = build();
    const vote = make('action', { title: 'Vote' });
    const accuse = make('dynamic', { title: 'Accusation' });
    const fellowship = make('aesthetic', { title: 'Fellowship' });
    const lonely = make('aesthetic', { title: 'Mystery' });
    root.edges.push(
      { id: 'e1', kind: 'leadsTo', source: vote.id, target: accuse.id },
      { id: 'e2', kind: 'leadsTo', source: accuse.id, target: fellowship.id },
    );
    const md = exportMarkdown(project);
    expect(md).toContain('**Mechanics that lead here:** Vote');
    const lonelyBlock = md.slice(md.indexOf('### Mystery'));
    expect(lonelyBlock).toContain('No mechanic leads here yet.');
    expect(lonely.id).toBeTruthy();
  });

  it('nests inner graphs under their node, one heading level deeper', () => {
    const { project, root, make } = build();
    const voting = make('mechanic', { title: 'Voting' });
    const inner = createGraph('Voting', voting.id);
    inner.nodes.push(createNode('action', { x: 0, y: 0 }, [], { title: 'Cast vote' }));
    project.graphs[inner.id] = inner;
    voting.childGraphId = inner.id;
    expect(root.nodes).toHaveLength(1);
    const md = exportMarkdown(project);
    expect(md).toContain('### Voting');
    expect(md).toContain('#### Inside "Voting"');
    expect(md).toContain('##### Core mechanic (layer 0)');
    expect(md).toContain('###### Cast vote');
  });

  it('never goes deeper than six heading levels', () => {
    const { project, make } = build();
    let parent = make('mechanic', { title: 'Level 0' });
    for (let i = 1; i <= 3; i++) {
      const inner = createGraph(`g${i}`, parent.id);
      const node = createNode('mechanic', { x: 0, y: 0 }, [], { title: `Level ${i}` });
      inner.nodes.push(node);
      project.graphs[inner.id] = inner;
      parent.childGraphId = inner.id;
      parent = node;
    }
    expect(exportMarkdown(project)).not.toContain('#######');
  });

  it('labels the deferred layers in core-only mode, and only then', () => {
    const { project, make } = build();
    make('mechanic', { title: 'Core thing' });
    make('narrative', { title: 'Story' });
    make('mechanic', { title: 'Meta thing', layer: 1 });
    const normal = exportMarkdown(project);
    expect(normal).not.toContain('deferred');

    const md = exportMarkdown({ ...project, coreOnly: true });
    expect(md).toContain('## Narrative (layer 3) - deferred');
    expect(md).toContain('## Secondary mechanic (layer 1) - deferred');
    expect(md).toContain('## Core mechanic (layer 0)\n');
    expect(md).not.toContain('## Core mechanic (layer 0) - deferred');
    expect(md).toContain('Core-only prototype');
  });

  it('handles an empty project and a node without a title', () => {
    const empty = exportMarkdown(createProject('Empty'));
    expect(empty).toContain('# Empty');
    const { project, make } = build();
    make('note', { title: '' });
    expect(exportMarkdown(project)).toContain('### Note');
  });
});
