import { newId } from '../lib/id';
import { strings } from '../lib/strings';
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
