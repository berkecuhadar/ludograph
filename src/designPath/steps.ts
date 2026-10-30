import { strings } from '../lib/strings';
import type { DesignOrder, GameNode, Project } from '../model/types';

export type StepId = 'experience' | 'personas' | 'narrative' | 'progression' | 'secondary' | 'core';

// Outside-in is the default way of working with the onion. Core-first is for a
// genuinely new core mechanic, where you prototype only the core before adding layers.
export const STEP_ORDER: Record<DesignOrder, StepId[]> = {
  outsideIn: ['experience', 'personas', 'narrative', 'progression', 'secondary', 'core'],
  coreFirst: ['core', 'secondary', 'progression', 'narrative', 'experience', 'personas'],
};

export function stepMatches(step: StepId, node: GameNode): boolean {
  switch (step) {
    case 'experience':
      return node.kind === 'aesthetic' || node.kind === 'pillar';
    case 'personas':
      return node.kind === 'persona';
    case 'narrative':
      return node.layer === 3;
    case 'progression':
      return node.layer === 2;
    case 'secondary':
      return node.layer === 1;
    case 'core':
      return node.layer === 0;
  }
}

const VAGUE_DESCRIPTION = 30;
export const OCEAN_KEYS = ['o', 'c', 'e', 'a', 'n'] as const;

export function missingOcean(node: GameNode): boolean {
  return OCEAN_KEYS.some((k) => node.ocean?.[k] === undefined);
}

export function isVagueDescription(node: GameNode): boolean {
  return node.description.trim().length < VAGUE_DESCRIPTION;
}

export type StepSummary = {
  count: number;
  /** Short facts, for example "3 personas" or "1 missing OCEAN values". */
  notes: string[];
  /** There is something here and nothing obviously missing. */
  complete: boolean;
};

export function summarizeStep(step: StepId, nodes: GameNode[]): StepSummary {
  const t = strings.designPath.notes;
  const members = nodes.filter((n) => stepMatches(step, n));
  const count = members.length;
  if (count === 0) return { count, notes: [t.empty[step]], complete: false };

  const notes: string[] = [];
  let problems = 0;
  const flag = (n: number, text: (n: number) => string) => {
    if (n === 0) return;
    notes.push(text(n));
    problems += n;
  };

  switch (step) {
    case 'experience': {
      const aesthetics = members.filter((n) => n.kind === 'aesthetic');
      notes.push(t.experience(aesthetics.length, count - aesthetics.length));
      flag(aesthetics.filter(isVagueDescription).length, t.vague);
      break;
    }
    case 'personas':
      notes.push(t.personas(count));
      flag(members.filter(missingOcean).length, t.missingOcean);
      break;
    case 'narrative':
      notes.push(t.nodes(count));
      flag(members.filter((n) => n.kind === 'narrative' && !n.contentCost).length, t.noCost);
      break;
    case 'progression':
      notes.push(t.nodes(count));
      flag(members.filter((n) => !n.prototypeScope).length, t.noScope);
      break;
    case 'secondary':
      notes.push(t.nodes(count));
      flag(members.filter((n) => !n.returnHook?.trim()).length, t.noHook);
      break;
    case 'core':
      notes.push(t.nodes(count));
      break;
  }

  return { count, notes, complete: problems === 0 };
}

export function allNodes(project: Project): GameNode[] {
  return Object.values(project.graphs).flatMap((g) => g.nodes);
}
