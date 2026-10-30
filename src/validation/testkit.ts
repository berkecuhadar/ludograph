import { createNode, createProject } from '../model/factory';
import type { EdgeKind, GameEdge, GameNode, NodeKind } from '../model/types';
import type { RuleContext, ValidationSettings } from './types';

// Helpers for the rule tests.
export const DEFAULT_TEST_SETTINGS: ValidationSettings = {
  onionHeuristic: true,
  heavyCoreLimit: 5,
};

export const n = (kind: NodeKind, overrides: Partial<GameNode> = {}): GameNode =>
  createNode(kind, { x: 0, y: 0 }, [], overrides);

let edgeCounter = 0;
export const e = (kind: EdgeKind, source: GameNode, target: GameNode): GameEdge => ({
  id: `e${++edgeCounter}`,
  kind,
  source: source.id,
  target: target.id,
});

export function ctxOf(
  nodes: GameNode[],
  edges: GameEdge[] = [],
  settings: Partial<ValidationSettings> = {},
): RuleContext {
  const project = createProject('test');
  const graph = { ...project.graphs[project.rootGraphId]!, nodes, edges };
  return {
    graph,
    project: { ...project, graphs: { [graph.id]: graph } },
    settings: { ...DEFAULT_TEST_SETTINGS, ...settings },
  };
}
