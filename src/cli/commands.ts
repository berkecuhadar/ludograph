import { EDGE_RULES } from '../model/edgeRules';
import { createProject } from '../model/factory';
import { removeNodesFromProject } from '../model/graphOps';
import { KIND_DEFAULTS } from '../model/kinds';
import { parseProjectText } from '../model/schema';
import {
  AESTHETIC_TYPES,
  CONTENT_COSTS,
  EDGE_KINDS,
  PROTOTYPE_SCOPES,
  RESOURCE_ROLES,
  STATUSES,
  type Project,
} from '../model/types';
import { runValidation } from '../validation';
import { applyBatch, findGraph, findNode, type Batch, type NodeSpec } from './batch';

export const VALIDATION_SETTINGS = { onionHeuristic: true, heavyCoreLimit: 5 };

export type Flags = Record<string, string | string[] | boolean | undefined>;

const one = (flags: Flags, key: string): string | undefined => {
  const v = flags[key];
  return typeof v === 'string' ? v : Array.isArray(v) ? v[v.length - 1] : undefined;
};
const many = (flags: Flags, key: string): string[] | undefined => {
  const v = flags[key];
  if (typeof v === 'string') return [v];
  return Array.isArray(v) ? v : undefined;
};

function parseValue(raw: string): string | number | boolean {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return raw;
}

// Builds a node spec from command line flags. "none" clears an optional field.
export function specFromFlags(flags: Flags): NodeSpec | string {
  const spec: Record<string, unknown> = {};
  const text = [
    ['id', 'id'],
    ['kind', 'kind'],
    ['title', 'title'],
    ['description', 'description'],
    ['mda', 'mda'],
    ['status', 'status'],
    ['parent', 'parent'],
    ['graph', 'graph'],
  ] as const;
  for (const [flag, key] of text) {
    const v = one(flags, flag);
    if (v !== undefined) spec[key] = v;
  }
  const clearable = [
    ['aesthetic-type', 'aestheticType'],
    ['resource-role', 'resourceRole'],
    ['content-cost', 'contentCost'],
    ['prototype-scope', 'prototypeScope'],
    ['return-hook', 'returnHook'],
  ] as const;
  for (const [flag, key] of clearable) {
    const v = one(flags, flag);
    if (v !== undefined) spec[key] = v === 'none' ? null : v;
  }
  const layer = one(flags, 'layer');
  if (layer !== undefined) {
    if (layer === 'none') spec.layer = null;
    else if (['0', '1', '2', '3'].includes(layer)) spec.layer = Number(layer);
    else return `--layer must be 0, 1, 2, 3 or none, got "${layer}".`;
  }
  const tags = many(flags, 'tag');
  if (tags) spec.tags = tags;
  const params = many(flags, 'param');
  if (params) {
    const out: Record<string, string | number | boolean> = {};
    for (const p of params) {
      const at = p.indexOf('=');
      if (at < 1) return `--param needs key=value, got "${p}".`;
      out[p.slice(0, at)] = parseValue(p.slice(at + 1));
    }
    spec.params = out;
  }
  const x = one(flags, 'x');
  const y = one(flags, 'y');
  if (x !== undefined && y !== undefined) spec.position = { x: Number(x), y: Number(y) };
  return spec as NodeSpec;
}

export type Outcome =
  { ok: true; output: unknown; project?: Project } | { ok: false; errors: string[] };

const fail = (...errors: string[]): Outcome => ({ ok: false, errors });

export function readProject(text: string): { project: Project } | { errors: string[] } {
  const parsed = parseProjectText(text);
  return parsed.ok ? { project: parsed.project } : { errors: parsed.errors };
}

export function initProject(name: string): Outcome {
  const project = createProject(name);
  return { ok: true, output: { created: name, rootGraphId: project.rootGraphId }, project };
}

export function infoOf(project: Project): unknown {
  return {
    name: project.name,
    rootGraphId: project.rootGraphId,
    graphs: Object.values(project.graphs).map((g) => ({
      id: g.id,
      name: g.name,
      parentNodeId: g.parentNodeId,
      nodes: g.nodes.length,
      edges: g.edges.length,
    })),
    customKinds: project.customKinds.map((k) => k.id),
  };
}

export function listNodes(project: Project, flags: Flags): Outcome {
  const graph = findGraph(project, one(flags, 'graph'));
  const everywhere = flags.all === true;
  if (typeof graph === 'string' && !everywhere) return fail(graph);
  const graphs = everywhere
    ? Object.values(project.graphs)
    : [graph as Exclude<typeof graph, string>];
  const kind = one(flags, 'kind');
  const layer = one(flags, 'layer');
  const nodes = graphs.flatMap((g) =>
    g.nodes
      .filter(
        (n) =>
          (kind === undefined || n.kind === kind) &&
          (layer === undefined || String(n.layer) === layer),
      )
      .map((n) => ({
        id: n.id,
        graphId: g.id,
        kind: n.kind,
        title: n.title,
        layer: n.layer,
        status: n.status,
        tags: n.tags,
      })),
  );
  const edges = graphs.flatMap((g) =>
    g.edges.map((e) => ({
      graphId: g.id,
      kind: e.kind,
      from: e.source,
      to: e.target,
      label: e.label,
    })),
  );
  return { ok: true, output: flags['no-edges'] === true ? { nodes } : { nodes, edges } };
}

export function schemaOf(project?: Project): unknown {
  return {
    nodeKinds: Object.fromEntries(
      Object.entries(KIND_DEFAULTS).map(([k, d]) => [k, { mda: d.mda, layer: d.layer ?? null }]),
    ),
    customKinds: project?.customKinds.map((k) => `custom:${k.id}`) ?? [],
    edgeKinds: Object.fromEntries(EDGE_KINDS.map((k) => [k, EDGE_RULES[k]])),
    note: 'Edge rules use groups: mechanic is every kind on the mechanics axis (action, state, rule, resource, entity and so on).',
    statuses: STATUSES,
    aestheticTypes: AESTHETIC_TYPES,
    resourceRoles: RESOURCE_ROLES,
    contentCosts: CONTENT_COSTS,
    prototypeScopes: PROTOTYPE_SCOPES,
    layers: { 0: 'core mechanic', 1: 'secondary mechanic', 2: 'progression', 3: 'narrative' },
  };
}

export function applyAndReport(project: Project, batch: Batch): Outcome {
  const result = applyBatch(project, batch);
  if (!result.ok) return { ok: false, errors: result.errors };
  const { project: next, ...report } = result;
  return { ok: true, output: report, project: next };
}

export function removeNode(project: Project, ref: string): Outcome {
  const node = findNode(project, ref);
  if (typeof node === 'string') return fail(node);
  const graph = Object.values(project.graphs).find((g) => g.nodes.some((n) => n.id === node.id));
  if (!graph) return fail(`Node ${node.id} has no graph.`);
  const next = removeNodesFromProject(project, graph.id, new Set([node.id]));
  return { ok: true, output: { removed: node.id, title: node.title }, project: next };
}

export function removeEdges(project: Project, flags: Flags): Outcome {
  const from = one(flags, 'from');
  const to = one(flags, 'to');
  if (!from || !to) return fail('remove-edge needs --from and --to.');
  const source = findNode(project, from);
  const target = findNode(project, to);
  if (typeof source === 'string') return fail(source);
  if (typeof target === 'string') return fail(target);
  const kind = one(flags, 'kind');
  let removed = 0;
  const graphs = Object.fromEntries(
    Object.entries(project.graphs).map(([id, g]) => {
      const edges = g.edges.filter(
        (e) =>
          !(
            e.source === source.id &&
            e.target === target.id &&
            (kind === undefined || e.kind === kind)
          ),
      );
      removed += g.edges.length - edges.length;
      return [id, { ...g, edges }];
    }),
  );
  if (removed === 0) return fail('No such edge.');
  return { ok: true, output: { removed }, project: { ...project, graphs } };
}

export function validateProject(project: Project): { output: unknown; hasErrors: boolean } {
  const issues = runValidation(project, VALIDATION_SETTINGS);
  const titles = new Map(
    Object.values(project.graphs).flatMap((g) => g.nodes.map((n) => [n.id, n.title] as const)),
  );
  return {
    hasErrors: issues.some((i) => i.severity === 'error'),
    output: {
      counts: {
        error: issues.filter((i) => i.severity === 'error').length,
        warning: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
      },
      issues: issues.map((i) => ({
        severity: i.severity,
        rule: i.rule,
        graphId: i.graphId,
        nodes: i.nodeIds.map((id) => ({ id, title: titles.get(id) })),
        message: i.message,
      })),
    },
  };
}
