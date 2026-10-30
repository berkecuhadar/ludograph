import type { Gdd } from '../model/types';
import { ALL_FIELD_IDS, emptyGdd, GROUPS } from './sections';

// Reads and writes the file format of OpenGDD (https://github.com/berkecuhadar/opengdd),
// version 3: { version, values, enabled, custom, lang, exportedAt }.

export type OpenGddResult = { ok: true; gdd: Gdd } | { ok: false; error: string };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Version 2 drafts used other names for a few fields and for the optional sections.
const LEGACY_FIELDS: Record<string, string> = {
  concept: 'summary',
  ui: 'interface',
  assets: 'art',
  milestones: 'roadmap',
};
const LEGACY_MODULES: Record<string, string | null> = {
  lore: 'story',
  coop: 'multiplayer',
  risk: 'risk',
  ui: null,
  assets: null,
  monetization: 'business',
  techSpecs: 'tech',
  marketing: 'marketing',
  milestones: null,
};

function fromLegacy(form: unknown, modules: unknown): Gdd {
  const gdd = emptyGdd();
  if (isRecord(form)) {
    for (const [key, value] of Object.entries(form)) {
      const id = LEGACY_FIELDS[key] ?? key;
      if (id in gdd.values && typeof value === 'string') gdd.values[id] = value;
    }
  }
  if (isRecord(modules)) {
    for (const [key, on] of Object.entries(modules)) {
      const group = LEGACY_MODULES[key];
      if (on === true && group) gdd.enabled[group] = true;
    }
  }
  return gdd;
}

export function parseOpenGdd(input: string): OpenGddResult {
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (!isRecord(data)) return { ok: false, error: 'The file is not an OpenGDD document.' };

  // Files from before version 3 have the form fields at the top level.
  if (!('values' in data)) {
    const looksOld = ['title', 'concept', 'coreLoop'].some((k) => typeof data[k] === 'string');
    if (!looksOld) return { ok: false, error: 'The file is not an OpenGDD document.' };
    return { ok: true, gdd: fromLegacy(data, data.activeModules) };
  }

  const gdd = emptyGdd();
  if (isRecord(data.values)) {
    for (const id of ALL_FIELD_IDS) {
      const value = data.values[id];
      if (typeof value === 'string') gdd.values[id] = value;
    }
  }
  if (isRecord(data.enabled)) {
    for (const group of GROUPS) gdd.enabled[group.id] = data.enabled[group.id] === true;
  }
  if (Array.isArray(data.custom)) {
    data.custom.forEach((item, i) => {
      if (!isRecord(item)) return;
      gdd.custom.push({
        id: typeof item.id === 'string' && item.id ? item.id : `imported-${i}`,
        title: typeof item.title === 'string' ? item.title : '',
        body: typeof item.body === 'string' ? item.body : '',
      });
    });
  }
  return { ok: true, gdd };
}

export function toOpenGdd(gdd: Gdd): string {
  return `${JSON.stringify(
    {
      version: 3,
      values: gdd.values,
      enabled: gdd.enabled,
      custom: gdd.custom,
      lang: 'en',
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`;
}
