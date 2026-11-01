import { newId } from '../lib/id';
import { checkEdge } from '../model/edgeRules';
import { createNode } from '../model/factory';
import { ensureChildGraph, findGraphOfNode, patchNode, updateGraph } from '../model/graphOps';
import { parseProject } from '../model/schema';
import {
  EDGE_KINDS,
  type EdgeKind,
  type GameEdge,
  type GameNode,
  type Graph,
  type NodeKind,
  type Param,
  type Project,
} from '../model/types';

// What the command line and the scanners hand to the project: a list of nodes and edges
// described in plain JSON. Nodes are created, or updated when the id already exists.
export type NodeSpec = {
  id?: string;
  kind?: NodeKind;
  title?: string;
  description?: string;
  mda?: GameNode['mda'];
  layer?: GameNode['layer'] | null;
  status?: GameNode['status'];
  tags?: string[];
  params?: Param[] | Record<string, string | number | boolean>;
  position?: { x: number; y: number };
  aestheticType?: GameNode['aestheticType'] | null;
  resourceRole?: GameNode['resourceRole'] | null;
  ocean?: GameNode['ocean'] | null;
  contentCost?: GameNode['contentCost'] | null;
  prototypeScope?: GameNode['prototypeScope'] | null;
  returnHook?: string | null;
  /** Node (id or title) whose inside graph receives this node. */
  parent?: string;
  /** Graph (id or name) to put a new node in. Defaults to the batch graph, then the root. */
  graph?: string;
};

export type EdgeSpec = {
  kind: EdgeKind;
  /** Node id or exact title. */
  from: string;
  to: string;
  label?: string;
};

export type Batch = { graph?: string; nodes?: NodeSpec[]; edges?: EdgeSpec[] };

export type BatchResult =
  | {
      ok: true;
      project: Project;
      addedNodes: { id: string; title: string; graphId: string }[];
      updatedNodes: { id: string; title: string }[];
      addedEdges: number;
      skippedEdges: number;
    }
  | { ok: false; errors: string[] };

const NODE_KEYS = new Set([
  'id',
  'kind',
  'title',
  'description',
  'mda',
  'layer',
  'status',
  'tags',
  'params',
  'position',
  'aestheticType',
  'resourceRole',
  'ocean',
  'contentCost',
  'prototypeScope',
  'returnHook',
  'parent',
  'graph',
]);
const EDGE_KEYS = new Set(['kind', 'from', 'to', 'label']);
const NULLABLE = [
  'layer',
  'aestheticType',
  'resourceRole',
  'ocean',
  'contentCost',
  'prototypeScope',
  'returnHook',
] as const;

const GRID_COLUMNS = 5;
const GRID_X = 260;
const GRID_Y = 160;

export function findGraph(project: Project, ref: string | undefined): Graph | string {
  if (ref === undefined) return project.graphs[project.rootGraphId] as Graph;
  const byId = project.graphs[ref];
  if (byId) return byId;
  const byName = Object.values(project.graphs).filter((g) => g.name === ref);
  if (byName.length === 1) return byName[0] as Graph;
  if (byName.length > 1) return `Several graphs are called "${ref}". Use the id.`;
  return `No graph with the id or name "${ref}".`;
}

// Finds a node by id, or by exact title when the title is unique.
export function findNode(project: Project, ref: string): GameNode | string {
  const all = Object.values(project.graphs).flatMap((g) => g.nodes);
  const byId = all.find((n) => n.id === ref);
  if (byId) return byId;
  const byTitle = all.filter((n) => n.title === ref);
  if (byTitle.length === 1) return byTitle[0] as GameNode;
  if (byTitle.length > 1) {
    return `Several nodes are called "${ref}" (${byTitle.map((n) => n.id).join(', ')}). Use the id.`;
  }
  return `No node with the id or title "${ref}".`;
}

function normalizeParams(params: NodeSpec['params']): Param[] | undefined {
  if (params === undefined) return undefined;
  if (Array.isArray(params)) return params;
  return Object.entries(params).map(([key, value]) => ({ key, value }));
}

// Turns the spec into node fields. A null clears an optional field.
function fieldsOf(spec: NodeSpec): Partial<GameNode> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(spec)) {
    if (key === 'parent' || key === 'graph' || key === 'params' || value === undefined) continue;
    fields[key] = value;
  }
  for (const key of NULLABLE) if (fields[key] === null) fields[key] = undefined;
  const params = normalizeParams(spec.params);
  if (params) fields.params = params;
  // patchNode needs the key to be present for a clear to count, so keep explicit undefined.
  return fields as Partial<GameNode>;
}

export function applyBatch(input: Project, batch: Batch): BatchResult {
  const errors: string[] = [];
  let project = input;
  const addedNodes: { id: string; title: string; graphId: string }[] = [];
  const updatedNodes: { id: string; title: string }[] = [];
  const placement = new Map<string, { startY: number; count: number }>();

  const nextPosition = (graph: Graph) => {
    let slot = placement.get(graph.id);
    if (!slot) {
      const bottom = graph.nodes.reduce((max, n) => Math.max(max, n.position.y), -GRID_Y);
      slot = { startY: bottom + GRID_Y, count: 0 };
      placement.set(graph.id, slot);
    }
    const i = slot.count++;
    return {
      x: (i % GRID_COLUMNS) * GRID_X,
      y: slot.startY + Math.floor(i / GRID_COLUMNS) * GRID_Y,
    };
  };

  const batchGraph = findGraph(project, batch.graph);
  if (typeof batchGraph === 'string') return { ok: false, errors: [batchGraph] };

  (batch.nodes ?? []).forEach((spec, i) => {
    const label = `nodes[${i}]${spec.title ? ` "${spec.title}"` : ''}`;
    const unknown = Object.keys(spec).filter((k) => !NODE_KEYS.has(k));
    if (unknown.length > 0) {
      errors.push(`${label}: unknown field ${unknown.map((k) => `"${k}"`).join(', ')}.`);
      return;
    }

    const existing =
      spec.id === undefined
        ? undefined
        : Object.values(project.graphs)
            .flatMap((g) => g.nodes)
            .find((n) => n.id === spec.id);

    if (existing) {
      const owner = findGraphOfNode(project, existing.id) as Graph;
      const patch = fieldsOf(spec);
      delete patch.id;
      project = updateGraph(project, owner.id, (g) => ({
        ...g,
        nodes: g.nodes.map((n) => (n.id === existing.id ? patchNode(n, patch) : n)),
      }));
      updatedNodes.push({ id: existing.id, title: spec.title ?? existing.title });
      return;
    }

    if (!spec.kind || spec.title === undefined) {
      errors.push(`${label}: a new node needs "kind" and "title".`);
      return;
    }

    let target: Graph;
    if (spec.parent !== undefined) {
      const parent = findNode(project, spec.parent);
      if (typeof parent === 'string') {
        errors.push(`${label}: parent: ${parent}`);
        return;
      }
      const owner = findGraphOfNode(project, parent.id) as Graph;
      const inner = ensureChildGraph(project, owner.id, parent.id);
      if (!inner) return;
      project = inner.project;
      target = project.graphs[inner.childGraphId] as Graph;
    } else if (spec.graph !== undefined) {
      const found = findGraph(project, spec.graph);
      if (typeof found === 'string') {
        errors.push(`${label}: ${found}`);
        return;
      }
      target = found;
    } else {
      target = project.graphs[batchGraph.id] as Graph;
    }

    const overrides = fieldsOf(spec);
    for (const key of Object.keys(overrides) as (keyof GameNode)[]) {
      if (overrides[key] === undefined) delete overrides[key];
    }
    const node = createNode(spec.kind, spec.position ?? nextPosition(target), project.customKinds, {
      ...(spec.id === undefined ? {} : { id: spec.id }),
      ...overrides,
    });
    project = updateGraph(project, target.id, (g) => ({ ...g, nodes: [...g.nodes, node] }));
    addedNodes.push({ id: node.id, title: node.title, graphId: target.id });
  });

  let addedEdges = 0;
  let skippedEdges = 0;
  (batch.edges ?? []).forEach((spec, i) => {
    const label = `edges[${i}]`;
    const unknown = Object.keys(spec).filter((k) => !EDGE_KEYS.has(k));
    if (unknown.length > 0) {
      errors.push(`${label}: unknown field ${unknown.map((k) => `"${k}"`).join(', ')}.`);
      return;
    }
    if (!EDGE_KINDS.includes(spec.kind)) {
      errors.push(
        `${label}: unknown edge kind "${String(spec.kind)}". Use ${EDGE_KINDS.join(', ')}.`,
      );
      return;
    }
    const source = findNode(project, spec.from);
    const target = findNode(project, spec.to);
    if (typeof source === 'string' || typeof target === 'string') {
      errors.push(`${label}: ${typeof source === 'string' ? source : (target as string)}`);
      return;
    }
    const graph = findGraphOfNode(project, source.id) as Graph;
    if (!graph.nodes.some((n) => n.id === target.id)) {
      errors.push(
        `${label}: "${source.title}" and "${target.title}" are in different graphs, so they can't be connected.`,
      );
      return;
    }
    const same = graph.edges.find(
      (e) => e.kind === spec.kind && e.source === source.id && e.target === target.id,
    );
    if (same) {
      skippedEdges++;
      return;
    }
    const check = checkEdge(spec.kind, source, target, project.customKinds, graph.edges);
    if (!check.ok) {
      errors.push(`${label}: ${check.reason}`);
      return;
    }
    const edge: GameEdge = {
      id: newId('e'),
      kind: spec.kind,
      source: source.id,
      target: target.id,
    };
    if (spec.label) edge.label = spec.label;
    project = updateGraph(project, graph.id, (g) => ({ ...g, edges: [...g.edges, edge] }));
    addedEdges++;
  });

  if (errors.length > 0) return { ok: false, errors };

  // The same reader that opens files checks the result, so a bad value never reaches the file.
  const checked = parseProject(JSON.parse(JSON.stringify(project)));
  if (!checked.ok) return { ok: false, errors: checked.errors };
  return { ok: true, project: checked.project, addedNodes, updatedNodes, addedEdges, skippedEdges };
}
