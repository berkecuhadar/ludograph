import type { GameNode, Graph, Project } from '../model/types';
import { kindLabel } from '../model/kinds';

export type Severity = 'error' | 'warning' | 'info';

export type RuleId =
  | 'onionHeuristic'
  | 'vagueExperience'
  | 'personaWithoutOcean'
  | 'unestimatedNarrative'
  | 'unscopedOuterLayer'
  | 'secondaryWithoutHook'
  | 'emptyCore'
  | 'heavyCore'
  | 'orphan'
  | 'requiresCycle'
  | 'danglingMechanic'
  | 'unsupportedAesthetic'
  | 'coreLoopFlow'
  | 'resourceFlow'
  | 'implementedRequiresIdea'
  | 'duplicateTitle';

export type Issue = {
  /** Stable for the same finding, so the UI can keep its place between runs. */
  id: string;
  rule: RuleId;
  severity: Severity;
  graphId: string;
  /** The nodes involved. The first one is the one to focus. Empty for whole-graph findings. */
  nodeIds: string[];
  message: string;
};

export type ValidationSettings = {
  onionHeuristic: boolean;
  heavyCoreLimit: number;
};

export type RuleContext = {
  graph: Graph;
  project: Project;
  settings: ValidationSettings;
};

export type Rule = (ctx: RuleContext) => Issue[];

export function titleOf(node: GameNode, ctx: RuleContext): string {
  return node.title.trim() || kindLabel(node.kind, ctx.project.customKinds);
}

export function issue(
  rule: RuleId,
  severity: Severity,
  ctx: RuleContext,
  nodeIds: string[],
  message: string,
): Issue {
  return {
    id: `${rule}:${ctx.graph.id}:${nodeIds.join(',')}`,
    rule,
    severity,
    graphId: ctx.graph.id,
    nodeIds,
    message,
  };
}

export function nodeMap(graph: Graph): Map<string, GameNode> {
  return new Map(graph.nodes.map((n) => [n.id, n]));
}
