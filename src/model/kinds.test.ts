import { describe, expect, it } from 'vitest';
import { defaultsForKind, KIND_DEFAULTS, kindLabel } from './kinds';
import { BUILTIN_KINDS, type CustomKind } from './types';

describe('KIND_DEFAULTS', () => {
  it('covers every built-in kind', () => {
    for (const kind of BUILTIN_KINDS) {
      expect(KIND_DEFAULTS[kind]).toBeDefined();
    }
  });

  it('puts experience-side kinds outside the onion', () => {
    for (const kind of ['pillar', 'aesthetic', 'persona', 'dynamic', 'note'] as const) {
      expect(KIND_DEFAULTS[kind].layer).toBeUndefined();
    }
    expect(KIND_DEFAULTS.pillar.mda).toBe('aesthetics');
    expect(KIND_DEFAULTS.dynamic.mda).toBe('dynamics');
  });

  it('places outer-layer kinds where the model says', () => {
    expect(KIND_DEFAULTS.item.layer).toBe(2);
    expect(KIND_DEFAULTS.progression.layer).toBe(2);
    expect(KIND_DEFAULTS.narrative.layer).toBe(3);
  });

  it('keeps everything else in layer 0, and nothing in layer 1', () => {
    const layers = BUILTIN_KINDS.map((k) => KIND_DEFAULTS[k].layer);
    expect(layers).not.toContain(1);
    expect(KIND_DEFAULTS.mechanic.layer).toBe(0);
    expect(KIND_DEFAULTS.state.layer).toBe(0);
  });
});

describe('custom kinds', () => {
  const custom: CustomKind = {
    id: 'card',
    name: 'Card',
    color: '#aa5500',
    icon: 'square',
    mda: 'mechanics',
    layer: 1,
  };

  it('uses the custom kind settings', () => {
    expect(defaultsForKind('custom:card', [custom])).toEqual({ mda: 'mechanics', layer: 1 });
    expect(kindLabel('custom:card', [custom])).toBe('Card');
  });

  it('falls back when the kind no longer exists', () => {
    expect(defaultsForKind('custom:gone', [])).toEqual({ mda: 'mechanics' });
    expect(kindLabel('custom:gone', [])).toBe('gone');
  });
});
