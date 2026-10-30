import { describe, expect, it } from 'vitest';
import { createNode } from '../model/factory';
import type { GameNode, NodeKind } from '../model/types';
import { STEP_ORDER, stepMatches, summarizeStep } from './steps';

const node = (kind: NodeKind, overrides: Partial<GameNode> = {}) =>
  createNode(kind, { x: 0, y: 0 }, [], overrides);

describe('STEP_ORDER', () => {
  it('works outside-in: experience first, core last', () => {
    expect(STEP_ORDER.outsideIn).toEqual([
      'experience',
      'personas',
      'narrative',
      'progression',
      'secondary',
      'core',
    ]);
  });

  it('works core-first: core first, experience and personas as a check at the end', () => {
    expect(STEP_ORDER.coreFirst).toEqual([
      'core',
      'secondary',
      'progression',
      'narrative',
      'experience',
      'personas',
    ]);
  });
});

describe('stepMatches', () => {
  it('matches layers and kinds', () => {
    expect(stepMatches('core', node('mechanic'))).toBe(true);
    expect(stepMatches('secondary', node('mechanic', { layer: 1 }))).toBe(true);
    expect(stepMatches('progression', node('item'))).toBe(true);
    expect(stepMatches('narrative', node('narrative'))).toBe(true);
    expect(stepMatches('experience', node('pillar'))).toBe(true);
    expect(stepMatches('personas', node('persona'))).toBe(true);
    expect(stepMatches('core', node('aesthetic'))).toBe(false);
  });
});

describe('summarizeStep', () => {
  it('says what to do when a step is empty', () => {
    const summary = summarizeStep('personas', []);
    expect(summary.count).toBe(0);
    expect(summary.complete).toBe(false);
    expect(summary.notes).toHaveLength(1);
  });

  it('counts personas and the ones missing OCEAN values', () => {
    const full = node('persona', { ocean: { o: 1, c: 2, e: 3, a: 4, n: 5 } });
    const partial = node('persona', { ocean: { o: 1 } });
    const none = node('persona');
    const summary = summarizeStep('personas', [full, partial, none]);
    expect(summary.count).toBe(3);
    expect(summary.notes.join(' ')).toContain('3 personas');
    expect(summary.notes.join(' ')).toContain('2 missing OCEAN');
    expect(summary.complete).toBe(false);
  });

  it('is complete when nothing is missing', () => {
    const full = node('persona', { ocean: { o: 1, c: 2, e: 3, a: 4, n: 5 } });
    expect(summarizeStep('personas', [full]).complete).toBe(true);
  });

  it('flags narrative without content cost and secondary without return hook', () => {
    expect(summarizeStep('narrative', [node('narrative')]).complete).toBe(false);
    expect(summarizeStep('narrative', [node('narrative', { contentCost: 'low' })]).complete).toBe(
      true,
    );
    expect(summarizeStep('secondary', [node('mechanic', { layer: 1 })]).complete).toBe(false);
    expect(
      summarizeStep('secondary', [node('mechanic', { layer: 1, returnHook: 'daily boosters' })])
        .complete,
    ).toBe(true);
  });

  it('flags vague aesthetics', () => {
    const vague = node('aesthetic', { description: 'fun' });
    const clear = node('aesthetic', {
      description: 'Players laughing together while a round falls apart in an unexpected way.',
    });
    expect(summarizeStep('experience', [vague]).complete).toBe(false);
    expect(summarizeStep('experience', [clear]).complete).toBe(true);
  });
});
