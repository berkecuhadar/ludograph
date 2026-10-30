import { createProject } from '../model/factory';
import { parseProjectText } from '../model/schema';
import type { Project } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { strings } from './strings';

const PROJECT_KEY = 'ludograph:project:v1';
const BROKEN_KEY = 'ludograph:project:broken';
const SAVE_DELAY_MS = 500;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Storage can be full or blocked (private mode). Work goes on, just without autosave.
    return false;
  }
}

// What to show on start: the saved project, or an empty one the first time.
// A saved project that can't be read is kept under another key instead of being lost.
export function loadInitialProject(): { project: Project; notice?: string } {
  const raw = read(PROJECT_KEY);
  if (raw === null) return { project: createProject() };

  const result = parseProjectText(raw);
  if (result.ok) return { project: result.project };

  write(BROKEN_KEY, raw);
  return { project: createProject(), notice: strings.file.brokenSave };
}

export function saveLocally(project: Project): boolean {
  return write(PROJECT_KEY, JSON.stringify(project));
}

// Saves a moment after the project stops changing, and once more when the page closes.
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    saveLocally(useProjectStore.getState().project);
  };

  const unsubscribe = useProjectStore.subscribe((state, previous) => {
    if (state.project === previous.project) return;
    clearTimeout(timer);
    timer = setTimeout(flush, SAVE_DELAY_MS);
  });
  window.addEventListener('pagehide', flush);

  return () => {
    unsubscribe();
    window.removeEventListener('pagehide', flush);
    clearTimeout(timer);
  };
}
