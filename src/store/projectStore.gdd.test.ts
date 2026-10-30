import { beforeEach, describe, expect, it } from 'vitest';
import { emptyGdd } from '../gdd/sections';
import { createProject } from '../model/factory';
import { parseProject } from '../model/schema';
import { useProjectStore } from './projectStore';

const store = () => useProjectStore.getState();
const gdd = () => store().project.gdd;

beforeEach(() => {
  store().loadProject(createProject('test'));
});

describe('document actions', () => {
  it('starts without a document and creates one on the first edit', () => {
    expect(gdd()).toBeUndefined();
    store().setGddValue('summary', 'A game about clouds.');
    expect(gdd()?.values.summary).toBe('A game about clouds.');
    expect(gdd()?.values.title).toBe('');
  });

  it('merges typing into one undo step', () => {
    store().setGddValue('summary', 'A');
    const before = store().past.length;
    store().setGddValue('summary', 'AB');
    store().setGddValue('summary', 'ABC');
    expect(store().past.length).toBe(before);
    store().undo();
    expect(gdd()).toBeUndefined();
  });

  it('keeps different fields as separate undo steps', () => {
    store().setGddValue('summary', 'one');
    const before = store().past.length;
    store().setGddValue('audience', 'two');
    expect(store().past.length).toBe(before + 1);
  });

  it('switches optional sections on and off', () => {
    store().setGddEnabled('story', true);
    expect(gdd()?.enabled.story).toBe(true);
    store().setGddEnabled('story', false);
    expect(gdd()?.enabled.story).toBe(false);
  });

  it('adds, edits and removes your own sections', () => {
    const id = store().addCustomSection();
    expect(gdd()?.custom).toEqual([{ id, title: '', body: '' }]);
    store().updateCustomSection(id, { title: 'Accessibility' });
    store().updateCustomSection(id, { body: 'Colorblind modes.' });
    expect(gdd()?.custom[0]).toEqual({ id, title: 'Accessibility', body: 'Colorblind modes.' });
    const other = store().addCustomSection();
    expect(other).not.toBe(id);
    store().removeCustomSection(id);
    expect(gdd()?.custom.map((c) => c.id)).toEqual([other]);
  });

  it('replaces the whole document, as one undo step', () => {
    store().setGddValue('summary', 'old');
    const next = emptyGdd();
    next.values.title = 'New';
    store().setGdd(next);
    expect(gdd()?.values.summary).toBe('');
    store().undo();
    expect(gdd()?.values.summary).toBe('old');
  });

  it('is saved with the project and read back', () => {
    store().setGddValue('title', 'Cloud Keeper');
    store().setGddEnabled('risk', true);
    const id = store().addCustomSection();
    store().updateCustomSection(id, { title: 'Extra', body: 'More' });
    const result = parseProject(JSON.parse(JSON.stringify(store().project)));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.project.gdd).toEqual(gdd());
  });
});

describe('document in the file format', () => {
  it('points at the exact place of a bad value', () => {
    const raw = JSON.parse(JSON.stringify(store().project));
    raw.gdd = {
      values: { title: 5 },
      enabled: { story: 'yes' },
      custom: [{ id: 'c', title: 'x' }],
    };
    const result = parseProject(raw);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const text = result.errors.join('\n');
      expect(text).toContain('gdd.values.title');
      expect(text).toContain('gdd.enabled.story');
      expect(text).toContain('gdd.custom[0].body');
    }
  });

  it('accepts a project with no document', () => {
    expect(parseProject(JSON.parse(JSON.stringify(store().project))).ok).toBe(true);
  });
});
