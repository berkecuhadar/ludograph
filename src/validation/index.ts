import type { Project } from '../model/types';
import { coreLoopFlow, emptyCore, heavyCore } from './core';
import { personaWithoutOcean, unsupportedAesthetic, vagueExperience } from './experience';
import { danglingMechanic, resourceFlow } from './flow';
import { onionHeuristic } from './onionHeuristic';
import { secondaryWithoutHook, unestimatedNarrative, unscopedOuterLayer } from './outerLayers';
import { duplicateTitles, implementedRequiresIdea, orphan, requiresCycle } from './structure';
import type { Issue, Rule, Severity, ValidationSettings } from './types';

export type { Issue, RuleId, Severity, ValidationSettings } from './types';

const RULES: Rule[] = [
  onionHeuristic,
  vagueExperience,
  personaWithoutOcean,
  unestimatedNarrative,
  unscopedOuterLayer,
  secondaryWithoutHook,
  emptyCore,
  heavyCore,
  orphan,
  requiresCycle,
  danglingMechanic,
  unsupportedAesthetic,
  coreLoopFlow,
  resourceFlow,
  implementedRequiresIdea,
  duplicateTitles,
];

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

// Runs every rule on every graph of the project. Errors come first, and the
// order is otherwise the order of the rules above.
export function runValidation(project: Project, settings: ValidationSettings): Issue[] {
  const issues = Object.values(project.graphs).flatMap((graph) =>
    RULES.flatMap((rule) => rule({ graph, project, settings })),
  );
  return issues
    .map((item, i) => ({ item, i }))
    .sort((a, b) => ORDER[a.item.severity] - ORDER[b.item.severity] || a.i - b.i)
    .map(({ item }) => item);
}
