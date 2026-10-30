import { newId } from '../lib/id';
import { strings } from '../lib/strings';
import { createGraph } from './factory';
import type { GameEdge, GameNode, Graph, Project } from './types';

export function getGraph(project: Project, graphId: string): Graph {
  const graph = project.graphs[graphId];
  if (!graph) throw new Error(`Graph not found: ${graphId}`);
  return graph;
}

export function updateGraph(
  project: Project,
  graphId: string,
  fn: (graph: Graph) => Graph,
): Project {
  const graph = getGraph(project, graphId);
  return { ...project, graphs: { ...project.graphs, [graphId]: fn(graph) } };
}

export function removeNodes(graph: Graph, ids: ReadonlySet<string>): Graph {
  return {
    ...graph,
    nodes: graph.nodes.filter((n) => !ids.has(n.id)),
    edges: graph.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
  };
}

export type Snippet = { nodes: GameNode[]; edges: GameEdge[] };

// Picks the given nodes plus the edges that run between them. The result is a
// deep copy, so it is safe to keep around as clipboard content.
export function extractSnippet(graph: Graph, ids: ReadonlySet<string>): Snippet {
  const nodes = graph.nodes.filter((n) => ids.has(n.id));
  const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  return structuredClone({ nodes, edges });
}

// Turns a snippet into new nodes and edges with fresh ids. Inner graphs are not
// copied, so childGraphId is dropped.
export function instantiateSnippet(snippet: Snippet, offset: { x: number; y: number }): Snippet {
  const idMap = new Map<string, string>();
  const nodes = snippet.nodes.map((source) => {
    const node = structuredClone(source);
    const id = newId('n');
    idMap.set(source.id, id);
    delete node.childGraphId;
    return {
      ...node,
      id,
      title: `${node.title} ${strings.copySuffix}`,
      position: { x: node.position.x + offset.x, y: node.position.y + offset.y },
    };
  });
  const edges = snippet.edges.flatMap((edge) => {
    const source = idMap.get(edge.source);
    const target = idMap.get(edge.target);
    if (!source || !target) return [];
    return [{ ...structuredClone(edge), id: newId('e'), source, target }];
  });
  return { nodes, edges };
}

const OPTIONAL_NODE_KEYS = new Set<keyof GameNode>([
  'layer',
  'childGraphId',
  'aestheticType',
  'resourceRole',
  'ocean',
  'contentCost',
  'prototypeScope',
  'returnHook',
]);

// Applies a patch to a node. An optional field patched with undefined is removed
// from the node; the id never changes and required fields can't be unset.
export function patchNode(node: GameNode, patch: Partial<GameNode>): GameNode {
  const next: GameNode = { ...node, ...patch, id: node.id };
  for (const key of Object.keys(patch) as (keyof GameNode)[]) {
    if (patch[key] !== undefined) continue;
    if (OPTIONAL_NODE_KEYS.has(key)) delete (next as Partial<GameNode>)[key];
    else (next as Record<string, unknown>)[key] = node[key];
  }
  return next;
}

export function findGraphOfNode(project: Project, nodeId: string): Graph | undefined {
  return Object.values(project.graphs).find((g) => g.nodes.some((n) => n.id === nodeId));
}

// Ids of the inside graphs of these nodes, and of everything nested below them.
function descendantGraphIds(project: Project, nodes: GameNode[]): string[] {
  const found: string[] = [];
  const queue = nodes.flatMap((n) => (n.childGraphId ? [n.childGraphId] : []));
  while (queue.length > 0) {
    const id = queue.pop();
    const graph = id ? project.graphs[id] : undefined;
    if (!id || !graph || found.includes(id)) continue;
    found.push(id);
    for (const inner of graph.nodes) if (inner.childGraphId) queue.push(inner.childGraphId);
  }
  return found;
}

// How many nodes would disappear with these nodes, counting the ones inside them.
export function countInsideNodes(project: Project, nodes: GameNode[]): number {
  return descendantGraphIds(project, nodes).reduce(
    (sum, id) => sum + (project.graphs[id]?.nodes.length ?? 0),
    0,
  );
}

// Removes nodes (and their edges) from one graph, plus any graphs that were inside them.
export function removeNodesFromProject(
  project: Project,
  graphId: string,
  ids: ReadonlySet<string>,
): Project {
  const graph = getGraph(project, graphId);
  const doomed = graph.nodes.filter((n) => ids.has(n.id));
  const dropGraphs = new Set(descendantGraphIds(project, doomed));

  const gone = new Set(ids);
  const graphs: Record<string, Graph> = {};
  for (const [id, g] of Object.entries(project.graphs)) {
    if (dropGraphs.has(id)) {
      for (const n of g.nodes) gone.add(n.id);
      continue;
    }
    graphs[id] = id === graphId ? removeNodes(g, ids) : g;
  }

  const next: Project = { ...project, graphs };
  if (project.viewPositions) {
    const prune = (positions: Record<string, { x: number; y: number }> | undefined) =>
      positions && Object.fromEntries(Object.entries(positions).filter(([id]) => !gone.has(id)));
    next.viewPositions = {
      onion: prune(project.viewPositions.onion),
      mda: prune(project.viewPositions.mda),
    };
  }
  return next;
}

// Gives a node its inside graph if it has none yet.
export function ensureChildGraph(
  project: Project,
  graphId: string,
  nodeId: string,
): { project: Project; childGraphId: string } | null {
  const node = getGraph(project, graphId).nodes.find((n) => n.id === nodeId);
  if (!node) return null;
  if (node.childGraphId && project.graphs[node.childGraphId]) {
    return { project, childGraphId: node.childGraphId };
  }
  const child = createGraph(node.title || strings.project.insideName, node.id);
  const withNode = updateGraph(project, graphId, (g) => ({
    ...g,
    nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, childGraphId: child.id } : n)),
  }));
  return {
    project: { ...withNode, graphs: { ...withNode.graphs, [child.id]: child } },
    childGraphId: child.id,
  };
}

// The chain of graphs from the root down to this one, for the breadcrumb.
export function graphPath(project: Project, graphId: string): { graphId: string; label: string }[] {
  const path: { graphId: string; label: string }[] = [];
  const seen = new Set<string>();
  let current = project.graphs[graphId];
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const parentId = current.parentNodeId;
    if (parentId === undefined) {
      path.unshift({ graphId: current.id, label: current.name });
      break;
    }
    const parentGraph = findGraphOfNode(project, parentId);
    const parentNode = parentGraph?.nodes.find((n) => n.id === parentId);
    path.unshift({ graphId: current.id, label: parentNode?.title || current.name });
    current = parentGraph;
  }
  return path;
}
