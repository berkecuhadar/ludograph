import { describe, expect, it } from 'vitest';
import { createNode, createProject } from '../model/factory';
import type { GameNode, Project } from '../model/types';
import { GRAPH_SOURCES, pillarsToCreate } from './fromGraph';
import { gddMarkdown } from './markdown';
import { parseOpenGdd, toOpenGdd } from './openGdd';
import { ALL_FIELD_IDS, CORE_BLOCKS, emptyGdd, GROUPS, hasContent, splitPillars } from './sections';
import { applyTemplate, TEMPLATES } from './templates';

describe('sections', () => {
  it('has unique field ids and a switch for every optional section', () => {
    expect(new Set(ALL_FIELD_IDS).size).toBe(ALL_FIELD_IDS.length);
    expect(GROUPS).toHaveLength(14);
    expect(Object.keys(emptyGdd().enabled).sort()).toEqual(GROUPS.map((g) => g.id).sort());
  });

  it('starts empty', () => {
    expect(hasContent(emptyGdd())).toBe(false);
    expect(hasContent(undefined)).toBe(false);
    const gdd = emptyGdd();
    gdd.values.summary = 'Something';
    expect(hasContent(gdd)).toBe(true);
    expect(hasContent({ ...emptyGdd(), custom: [{ id: 'c', title: 'X', body: '' }] })).toBe(true);
  });

  it('splits pillars on the usual separators', () => {
    expect(splitPillars('Fast. Action-packed. Mayhem.')).toEqual([
      'Fast',
      'Action-packed',
      'Mayhem',
    ]);
    expect(splitPillars('One, two; three · four\nfive')).toEqual([
      'One',
      'two',
      'three',
      'four',
      'five',
    ]);
    expect(splitPillars('  ')).toEqual([]);
  });
});

describe('gddMarkdown', () => {
  it('writes title, identity line, pillars and every one-pager field', () => {
    const gdd = emptyGdd();
    gdd.values.title = 'Cloud Keeper';
    gdd.values.mantra = 'A calm game about weather.';
    gdd.values.pillars = 'Calm. Curious.';
    gdd.values.summary = 'Look after the sky.';
    const md = gddMarkdown(gdd, 'Fallback');
    expect(md.startsWith('# Cloud Keeper\n\n> A calm game about weather.')).toBe(true);
    expect(md).toContain('**Design pillars:** Calm / Curious');
    expect(md).toContain('## Summary\n\nLook after the sky.');
    const fields = CORE_BLOCKS.flatMap((b) => b.fields).filter(
      (f) => !['title', 'mantra', 'pillars'].includes(f.id),
    );
    for (const f of fields) expect(md).toContain(`## ${f.label}`);
    expect(md).toContain('_Not written yet._');
  });

  it('falls back to the project name when there is no title', () => {
    expect(gddMarkdown(emptyGdd(), 'My game').startsWith('# My game')).toBe(true);
  });

  it('only writes optional sections that are switched on', () => {
    const gdd = emptyGdd();
    gdd.enabled.story = true;
    gdd.values.lore = 'Long ago.';
    gdd.enabled.economy = true;
    gdd.values.economy = 'Gold and wood.';
    const md = gddMarkdown(gdd, 'x');
    expect(md).toContain('## Story');
    expect(md).toContain('### Backstory and universe\n\nLong ago.');
    expect(md).toContain('### Main plot');
    expect(md).toContain('## Economy\n\nGold and wood.');
    expect(md).not.toContain('### Currencies and resources');
    expect(md).not.toContain('## Multiplayer');
  });

  it('writes your own sections last', () => {
    const gdd = emptyGdd();
    gdd.enabled.risk = true;
    gdd.custom = [
      { id: 'c1', title: 'Accessibility', body: 'Colorblind modes.' },
      { id: 'c2', title: '', body: '' },
    ];
    const md = gddMarkdown(gdd, 'x');
    expect(md.indexOf('## Risk and reward')).toBeLessThan(md.indexOf('## Accessibility'));
    expect(md).toContain('## Accessibility\n\nColorblind modes.');
    expect(md).toContain('## Untitled section');
  });
});

describe('templates', () => {
  it('has three templates with unique ids', () => {
    expect(TEMPLATES).toHaveLength(3);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(3);
  });

  it('only fills known fields and opens known sections, each with text', () => {
    for (const t of TEMPLATES) {
      for (const id of Object.keys(t.values)) expect(ALL_FIELD_IDS).toContain(id);
      for (const group of t.groups) {
        const def = GROUPS.find((g) => g.id === group);
        expect(def, `${t.id}: ${group}`).toBeDefined();
        expect(def?.fields.some((f) => (t.values[f.id] ?? '').trim() !== '')).toBe(true);
      }
      for (const id of ['title', 'summary', 'genrePlatform', 'coreLoop', 'pillars']) {
        expect((t.values[id] ?? '').trim(), `${t.id}: ${id}`).not.toBe('');
      }
    }
  });

  it('writes the full text or just the genre line plus the sections', () => {
    const [template] = TEMPLATES;
    if (!template) throw new Error('setup');
    const full = applyTemplate(template, 'full');
    expect(full.values.summary).toBe(template.values.summary);
    expect(
      Object.entries(full.enabled)
        .filter(([, on]) => on)
        .map(([id]) => id),
    ).toEqual(expect.arrayContaining(template.groups));

    const skeleton = applyTemplate(template, 'skeleton');
    expect(skeleton.values.genrePlatform).toBe(template.values.genrePlatform);
    expect(skeleton.values.summary).toBe('');
    expect(skeleton.values.coreLoop).toBe('');
    for (const g of template.groups) expect(skeleton.enabled[g]).toBe(true);
  });

  it('uses plain punctuation, no long dashes', () => {
    for (const t of TEMPLATES) {
      for (const [id, value] of Object.entries(t.values)) {
        expect(value, `${t.id}: ${id}`).not.toMatch(/[—–]/);
      }
    }
  });

  it('fills the whole one-pager', () => {
    const onePager = CORE_BLOCKS.flatMap((b) => b.fields).map((f) => f.id);
    for (const t of TEMPLATES) {
      for (const id of onePager) expect((t.values[id] ?? '').trim(), `${t.id}: ${id}`).not.toBe('');
    }
  });
});

describe('OpenGDD files', () => {
  it('reads a version 3 file', () => {
    const file = JSON.stringify({
      version: 3,
      values: { title: 'Game', summary: 'Text', unknownField: 'ignored' },
      enabled: { story: true, economy: false, nonsense: true },
      custom: [{ id: 'c1', title: 'Extra', body: 'More' }, 'junk'],
      lang: 'tr',
    });
    const result = parseOpenGdd(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gdd.values.title).toBe('Game');
    expect('unknownField' in result.gdd.values).toBe(false);
    expect(result.gdd.enabled.story).toBe(true);
    expect('nonsense' in result.gdd.enabled).toBe(false);
    expect(result.gdd.custom).toEqual([{ id: 'c1', title: 'Extra', body: 'More' }]);
  });

  it('reads an old version 2 file and maps its names', () => {
    const file = JSON.stringify({
      title: 'Old game',
      concept: 'An old concept',
      ui: 'Old interface',
      activeModules: { lore: true, coop: true, ui: true, milestones: true },
    });
    const result = parseOpenGdd(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.gdd.values.summary).toBe('An old concept');
    expect(result.gdd.values.interface).toBe('Old interface');
    expect(result.gdd.enabled.story).toBe(true);
    expect(result.gdd.enabled.multiplayer).toBe(true);
  });

  it('refuses things that are not OpenGDD files', () => {
    expect(parseOpenGdd('{ nope').ok).toBe(false);
    expect(parseOpenGdd('[]').ok).toBe(false);
    expect(parseOpenGdd('{"hello": 1}').ok).toBe(false);
  });

  it('writes a file that it can read back', () => {
    const gdd = emptyGdd();
    gdd.values.title = 'Round trip';
    gdd.enabled.risk = true;
    gdd.custom = [{ id: 'c', title: 'T', body: 'B' }];
    const text = toOpenGdd(gdd);
    expect(JSON.parse(text).version).toBe(3);
    const back = parseOpenGdd(text);
    expect(back.ok && back.gdd).toEqual(gdd);
  });
});

function project(): Project {
  const p = createProject('Sample game');
  const root = p.graphs[p.rootGraphId];
  if (!root) throw new Error('setup');
  const add = (kind: Parameters<typeof createNode>[0], extra: Partial<GameNode>) => {
    const node = createNode(kind, { x: 0, y: 0 }, [], extra);
    root.nodes.push(node);
    return node;
  };
  add('pillar', { title: 'Calm.' });
  add('pillar', { title: 'Curious' });
  add('persona', { title: 'Weekend player', description: 'Plays to unwind. Short sessions.' });
  add('narrative', { title: 'The long winter' });
  add('progression', { title: 'Reputation' });
  add('rule', { title: 'Server decides', description: 'Clients only show what the server says' });
  add('action', { title: 'Plant' });
  add('mechanic', { title: 'Weather' });
  add('state', { title: 'State, not a mechanic' });
  add('resource', { title: 'Seeds', resourceRole: 'pool' });
  const loop = add('coreLoop', { title: 'Day cycle' });
  const water = add('state', { title: 'Water' });
  const harvest = add('state', { title: 'Harvest' });
  root.edges.push(
    { id: 'e1', kind: 'triggers', source: loop.id, target: water.id },
    { id: 'e2', kind: 'triggers', source: water.id, target: harvest.id },
    { id: 'e3', kind: 'triggers', source: harvest.id, target: loop.id },
  );
  return p;
}

describe('text from the graph', () => {
  const p = project();
  const build = (id: string) => GRAPH_SOURCES[id]?.build(p);

  it('lists pillars as a short run of sentences', () => {
    expect(build('pillars')).toBe('Calm. Curious.');
  });

  it('describes the core loop by following what it triggers, without looping forever', () => {
    expect(build('coreLoop')).toBe('Day cycle: Water → Harvest');
  });

  it('lists personas, rules, progression and story with a first sentence of the description', () => {
    expect(build('audience')).toBe('• Weekend player: Plays to unwind.');
    expect(build('rules')).toBe('• Server decides: Clients only show what the server says');
    expect(build('progression')).toBe('• Reputation');
    expect(build('lore')).toBe('• The long winter');
  });

  it('lists layer 0 mechanics and actions, and resources with their role', () => {
    expect(build('interaction')).toBe('• Plant\n• Weather');
    expect(build('economy')).toBe('• Seeds (pool)');
  });

  it('gives an empty text when the graph has nothing for the field', () => {
    const empty = createProject();
    for (const source of Object.values(GRAPH_SOURCES)) expect(source.build(empty)).toBe('');
  });

  it('finds pillars in the text that have no node yet, ignoring case and repeats', () => {
    expect(pillarsToCreate(p, 'calm. Brave. brave. Warm')).toEqual(['Brave', 'Warm']);
    expect(pillarsToCreate(createProject(), '')).toEqual([]);
  });
});
