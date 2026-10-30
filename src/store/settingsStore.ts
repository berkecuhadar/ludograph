import { create } from 'zustand';

export type Settings = {
  /** Ludograph's own runtime-dependency rule. Can be switched off. */
  onionHeuristic: boolean;
  /** More mechanic and action nodes than this in layer 0 triggers the heavy core note. */
  heavyCoreLimit: number;
};

export const DEFAULT_SETTINGS: Settings = { onionHeuristic: true, heavyCoreLimit: 5 };

const KEY = 'ludograph:settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS;
    const p = parsed as Partial<Settings>;
    return {
      onionHeuristic:
        typeof p.onionHeuristic === 'boolean' ? p.onionHeuristic : DEFAULT_SETTINGS.onionHeuristic,
      heavyCoreLimit:
        typeof p.heavyCoreLimit === 'number' && p.heavyCoreLimit >= 1
          ? Math.floor(p.heavyCoreLimit)
          : DEFAULT_SETTINGS.heavyCoreLimit,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function save(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage can be full or blocked. Settings just won't persist.
  }
}

type SettingsState = Settings & {
  update: (patch: Partial<Settings>) => void;
};

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch);
    const { onionHeuristic, heavyCoreLimit } = get();
    save({ onionHeuristic, heavyCoreLimit });
  },
}));
