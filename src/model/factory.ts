import { newId } from '../lib/id';
import { strings } from '../lib/strings';
import { defaultsForKind, kindLabel } from './kinds';
import type { CustomKind, GameNode, Graph, NodeKind, Project } from './types';

export function createNode(
  kind: NodeKind,
  position: { x: number; y: number },
  customKinds: CustomKind[] = [],
  overrides: Partial<GameNode> = {},
): GameNode {
  const defaults = defaultsForKind(kind, customKinds);
  const node: GameNode = {
    id: newId('n'),
    kind,
    title: kindLabel(kind, customKinds),
    description: '',
    mda: defaults.mda,
    status: 'idea',
    tags: [],
    params: [],
    position,
  };
  if (defaults.layer !== undefined) node.layer = defaults.layer;
  return { ...node, ...overrides };
}

export function createGraph(name: string, parentNodeId?: string): Graph {
  const graph: Graph = { id: newId('g'), name, nodes: [], edges: [] };
  if (parentNodeId !== undefined) graph.parentNodeId = parentNodeId;
  return graph;
}

export function createProject(name: string = strings.project.untitled): Project {
  const root = createGraph(strings.project.rootGraph);
  return {
    schemaVersion: 1,
    id: newId('p'),
    name,
    rootGraphId: root.id,
    designOrder: 'outsideIn',
    graphs: { [root.id]: root },
    customKinds: [],
  };
}
