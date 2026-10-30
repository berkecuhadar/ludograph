import { beforeEach, describe, expect, it } from 'vitest';
import { TEMPLATES } from '../gdd/templates';
import { createNode, createProject } from '../model/factory';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import {
  createPillarNodes,
  importOpenGddFile,
  pullFromGraph,
  startFromTemplate,
} from './documentActions';

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();
const values = () => store().project.gdd?.values ?? {};
const rootNodes = () => store().project.graphs[store().project.rootGraphId]?.nodes ?? [];

// The confirm dialog is a promise that waits for the user. Tests answer it.
const answer = (ok: boolean) => ui().resolveConfirm(ok);
const asking = () => ui().confirm !== null;

beforeEach(() => {
  store().loadProject(createProject('test'));
  useUiStore.setState({ notice: null, confirm: null, dialog: null, importErrors: [] });
});

function addPillar(title: string) {
  store().addNode('pillar', { x: 0, y: 0 }, { title });
}

describe('pullFromGraph', () => {
  it('fills an empty field straight away', async () => {
    addPillar('Calm');
    addPillar('Curious');
    await pullFromGraph('pillars');
    expect(values().pillars).toBe('Calm. Curious.');
    expect(asking()).toBe(false);
  });

  it('asks before replacing text you wrote, and keeps it if you say no', async () => {
    addPillar('Calm');
    store().setGddValue('pillars', 'My own pillars.');
    const done = pullFromGraph('pillars');
    await Promise.resolve();
    expect(asking()).toBe(true);
    answer(false);
    await done;
    expect(values().pillars).toBe('My own pillars.');
  });

  it('replaces the text when you say yes', async () => {
    addPillar('Calm');
    store().setGddValue('pillars', 'My own pillars.');
    const done = pullFromGraph('pillars');
    await Promise.resolve();
    answer(true);
    await done;
    expect(values().pillars).toBe('Calm.');
  });

  it('does not ask when the text is already the same', async () => {
    addPillar('Calm');
    store().setGddValue('pillars', 'Calm.');
    await pullFromGraph('pillars');
    expect(asking()).toBe(false);
  });

  it('says so when the graph has nothing for the field, and leaves the text alone', async () => {
    store().setGddValue('audience', 'Written by hand');
    await pullFromGraph('audience');
    expect(ui().notice?.text).toContain('nothing');
    expect(values().audience).toBe('Written by hand');
  });

  it('ignores fields that have no source', async () => {
    await pullFromGraph('roadmap');
    expect(store().project.gdd).toBeUndefined();
  });
});

describe('createPillarNodes', () => {
  it('adds a node for each pillar that has none, in the main graph', () => {
    addPillar('Calm');
    store().setGddValue('pillars', 'Calm. Brave. Warm');
    createPillarNodes();
    const titles = rootNodes().map((n) => n.title);
    expect(titles).toEqual(['Calm', 'Brave', 'Warm']);
    expect(ui().notice?.text).toContain('2 pillar nodes');
  });

  it('does nothing twice', () => {
    store().setGddValue('pillars', 'Brave');
    createPillarNodes();
    createPillarNodes();
    expect(rootNodes()).toHaveLength(1);
    expect(ui().notice?.text).toContain('already');
  });

  it('puts the new nodes below the existing ones, in one undo step', () => {
    store().addNode('mechanic', { x: 0, y: 500 });
    store().setGddValue('pillars', 'One. Two');
    createPillarNodes();
    const pillars = rootNodes().filter((n) => n.kind === 'pillar');
    expect(pillars.every((n) => n.position.y > 500)).toBe(true);
    store().undo();
    expect(rootNodes()).toHaveLength(1);
  });

  it('adds to the main graph even from inside a drill-down', () => {
    const outer = store().addNode('mechanic', { x: 0, y: 0 });
    store().openNode(outer);
    store().setGddValue('pillars', 'Brave');
    createPillarNodes();
    expect(rootNodes().some((n) => n.title === 'Brave')).toBe(true);
    expect(store().activeGraphId).not.toBe(store().project.rootGraphId);
  });
});

describe('startFromTemplate', () => {
  it('fills an empty document without asking', async () => {
    const [template] = TEMPLATES;
    if (!template) throw new Error('setup');
    await startFromTemplate(template, 'full');
    expect(values().title).toBe(template.values.title);
    expect(asking()).toBe(false);
  });

  it('asks before replacing a document that has text', async () => {
    const [template] = TEMPLATES;
    if (!template) throw new Error('setup');
    store().setGddValue('summary', 'Mine');
    const done = startFromTemplate(template, 'full');
    await Promise.resolve();
    expect(asking()).toBe(true);
    answer(false);
    await done;
    expect(values().summary).toBe('Mine');
  });

  it('leaves the graph alone', async () => {
    const [template] = TEMPLATES;
    if (!template) throw new Error('setup');
    store().addNode('mechanic', { x: 0, y: 0 });
    await startFromTemplate(template, 'full');
    expect(rootNodes()).toHaveLength(1);
  });
});

describe('importOpenGddFile', () => {
  const file = (text: string) => new File([text], 'game.json', { type: 'application/json' });

  it('reads an OpenGDD file into the document', async () => {
    await importOpenGddFile(
      file(JSON.stringify({ version: 3, values: { title: 'Imported' }, enabled: {}, custom: [] })),
    );
    expect(values().title).toBe('Imported');
    expect(ui().notice?.text).toContain('Imported');
  });

  it('shows what is wrong with a file that is not OpenGDD, and changes nothing', async () => {
    store().setGddValue('title', 'Keep');
    await importOpenGddFile(file('{ not json'));
    expect(ui().dialog).toBe('errors');
    expect(ui().importErrors[0]).toContain('not valid JSON');
    expect(values().title).toBe('Keep');
  });

  it('asks before replacing a document that has text', async () => {
    store().setGddValue('title', 'Keep');
    const done = importOpenGddFile(file(JSON.stringify({ version: 3, values: { title: 'New' } })));
    await new Promise((r) => setTimeout(r, 0));
    expect(asking()).toBe(true);
    answer(false);
    await done;
    expect(values().title).toBe('Keep');
  });
});

describe('the nodes it reads', () => {
  it('pulls text from nodes in drill-down graphs too', async () => {
    const outer = store().addNode('mechanic', { x: 0, y: 0 });
    store().openNode(outer);
    store().addNode('pillar', { x: 0, y: 0 }, { title: 'Deep pillar' });
    store().setActiveGraph(store().project.rootGraphId);
    await pullFromGraph('pillars');
    expect(values().pillars).toBe('Deep pillar.');
    expect(createNode('pillar', { x: 0, y: 0 }).kind).toBe('pillar');
  });
});
