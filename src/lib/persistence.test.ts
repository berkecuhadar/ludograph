import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject } from '../model/factory';
import { useProjectStore } from '../store/projectStore';
import { loadInitialProject, saveLocally, startAutosave } from './persistence';

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

const nodeCount = (project: ReturnType<typeof createProject>) =>
  Object.values(project.graphs).reduce((sum, g) => sum + g.nodes.length, 0);

describe('loadInitialProject', () => {
  it('opens an empty project the first time', () => {
    const { project, notice } = loadInitialProject();
    expect(nodeCount(project)).toBe(0);
    expect(notice).toBeUndefined();
  });

  it('opens what was saved last time', () => {
    const saved = createProject('My game');
    saveLocally(saved);
    expect(loadInitialProject().project).toEqual(saved);
  });

  it('falls back to an empty project when the saved data is broken, and keeps a copy of it', () => {
    localStorage.setItem('ludograph:project:v1', '{ broken');
    const { project, notice } = loadInitialProject();
    expect(nodeCount(project)).toBe(0);
    expect(notice).toBeTruthy();
    expect(localStorage.getItem('ludograph:project:broken')).toBe('{ broken');
  });

  it('survives storage that throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(nodeCount(loadInitialProject().project)).toBe(0);
    spy.mockRestore();
  });
});

describe('saveLocally', () => {
  it('reports failure instead of throwing', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(saveLocally(createProject())).toBe(false);
    spy.mockRestore();
  });
});

describe('startAutosave', () => {
  it('saves a moment after a change, not on every keystroke', () => {
    vi.useFakeTimers();
    useProjectStore.getState().loadProject(createProject('Autosaved'));
    const stop = startAutosave();

    useProjectStore.getState().setProjectName('First');
    useProjectStore.getState().setProjectName('Second');
    expect(localStorage.getItem('ludograph:project:v1')).toBeNull();

    vi.advanceTimersByTime(600);
    const raw = localStorage.getItem('ludograph:project:v1');
    expect(raw && JSON.parse(raw).name).toBe('Second');
    stop();
  });

  it('stops saving once stopped', () => {
    vi.useFakeTimers();
    useProjectStore.getState().loadProject(createProject('Stopped'));
    const stop = startAutosave();
    stop();
    useProjectStore.getState().setProjectName('Changed');
    vi.advanceTimersByTime(1000);
    expect(localStorage.getItem('ludograph:project:v1')).toBeNull();
  });
});
