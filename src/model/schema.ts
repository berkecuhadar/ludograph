import {
  AESTHETIC_TYPES,
  CONTENT_COSTS,
  EDGE_KINDS,
  MDA_AXES,
  PROTOTYPE_SCOPES,
  RESOURCE_ROLES,
  STATUSES,
  type BuiltinKind,
  type CustomKind,
  type GameEdge,
  type Gdd,
  type GameNode,
  type Graph,
  type Layer,
  type NodeKind,
  type Ocean,
  type Param,
  type PlacedView,
  type Point,
  type Project,
} from './types';
import { BUILTIN_KINDS } from './types';

export type ParseResult = { ok: true; project: Project } | { ok: false; errors: string[] };

const MAX_ERRORS = 25;
const OCEAN_KEYS: (keyof Ocean)[] = ['o', 'c', 'e', 'a', 'n'];

type Record_ = Record<string, unknown>;
const isRecord = (v: unknown): v is Record_ =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v);
const describe = (v: unknown) =>
  typeof v === 'string' ? `"${v}"` : (JSON.stringify(v) ?? 'nothing');
const listOf = (allowed: readonly string[]) => allowed.map((a) => `"${a}"`).join(', ');

class Reader {
  readonly errors: string[] = [];
  total = 0;

  fail(path: string, message: string) {
    this.total++;
    if (this.errors.length < MAX_ERRORS) this.errors.push(`${path}: ${message}`);
  }

  string(obj: Record_, key: string, path: string, options: { optional?: boolean } = {}) {
    const v = obj[key];
    if (v === undefined && options.optional) return undefined;
    if (typeof v !== 'string') {
      this.fail(`${path}.${key}`, `expected text, got ${describe(v)}`);
      return undefined;
    }
    return v;
  }

  choice<T extends string>(
    obj: Record_,
    key: string,
    allowed: readonly T[],
    path: string,
    options: { optional?: boolean } = {},
  ): T | undefined {
    const v = obj[key];
    if (v === undefined && options.optional) return undefined;
    if (!oneOf(v, allowed)) {
      this.fail(`${path}.${key}`, `expected one of ${listOf(allowed)}, got ${describe(v)}`);
      return undefined;
    }
    return v;
  }

  point(v: unknown, path: string): Point | undefined {
    if (!isRecord(v) || !Number.isFinite(v.x) || !Number.isFinite(v.y)) {
      this.fail(path, 'expected {"x": number, "y": number}');
      return undefined;
    }
    return { x: v.x as number, y: v.y as number };
  }

  array(obj: Record_, key: string, path: string, options: { optional?: boolean } = {}) {
    const v = obj[key];
    if (v === undefined && options.optional) return [];
    if (!Array.isArray(v)) {
      this.fail(`${path}.${key}`, `expected a list, got ${describe(v)}`);
      return [];
    }
    return v as unknown[];
  }
}

function parseNode(raw: unknown, path: string, r: Reader): GameNode | null {
  if (!isRecord(raw)) {
    r.fail(path, 'expected an object');
    return null;
  }
  const before = r.total;

  const id = r.string(raw, 'id', path);
  let kind: NodeKind | undefined;
  if (typeof raw.kind === 'string' && raw.kind.startsWith('custom:') && raw.kind.length > 7) {
    kind = raw.kind as NodeKind;
  } else if (oneOf(raw.kind, BUILTIN_KINDS as readonly BuiltinKind[])) {
    kind = raw.kind;
  } else {
    r.fail(`${path}.kind`, `unknown kind ${describe(raw.kind)}`);
  }
  const title = r.string(raw, 'title', path);
  const description = raw.description === undefined ? '' : r.string(raw, 'description', path);
  const mda = r.choice(raw, 'mda', MDA_AXES, path);
  const status = r.choice(raw, 'status', STATUSES, path);
  const position = r.point(raw.position, `${path}.position`);

  let layer: Layer | undefined;
  if (raw.layer !== undefined) {
    if (raw.layer === 0 || raw.layer === 1 || raw.layer === 2 || raw.layer === 3) layer = raw.layer;
    else r.fail(`${path}.layer`, `expected 0, 1, 2 or 3, got ${describe(raw.layer)}`);
  }

  const tags: string[] = [];
  r.array(raw, 'tags', path, { optional: true }).forEach((t, i) => {
    if (typeof t === 'string') tags.push(t);
    else r.fail(`${path}.tags[${i}]`, `expected text, got ${describe(t)}`);
  });

  const params: Param[] = [];
  r.array(raw, 'params', path, { optional: true }).forEach((p, i) => {
    const pp = `${path}.params[${i}]`;
    if (!isRecord(p) || typeof p.key !== 'string') return r.fail(pp, 'expected {"key", "value"}');
    if (
      typeof p.value === 'string' ||
      typeof p.value === 'number' ||
      typeof p.value === 'boolean'
    ) {
      params.push({ key: p.key, value: p.value });
    } else r.fail(`${pp}.value`, `expected text, number or true/false, got ${describe(p.value)}`);
  });

  const aestheticType = r.choice(raw, 'aestheticType', AESTHETIC_TYPES, path, { optional: true });
  const resourceRole = r.choice(raw, 'resourceRole', RESOURCE_ROLES, path, { optional: true });
  const contentCost = r.choice(raw, 'contentCost', CONTENT_COSTS, path, { optional: true });
  const prototypeScope = r.choice(raw, 'prototypeScope', PROTOTYPE_SCOPES, path, {
    optional: true,
  });
  const returnHook = r.string(raw, 'returnHook', path, { optional: true });
  const childGraphId = r.string(raw, 'childGraphId', path, { optional: true });

  let ocean: Partial<Ocean> | undefined;
  if (raw.ocean !== undefined) {
    if (!isRecord(raw.ocean)) r.fail(`${path}.ocean`, 'expected an object with o, c, e, a, n');
    else {
      ocean = {};
      for (const k of OCEAN_KEYS) {
        const v = raw.ocean[k];
        if (v === undefined) continue;
        if (typeof v === 'number' && v >= 0 && v <= 100) ocean[k] = v;
        else r.fail(`${path}.ocean.${k}`, `expected a number from 0 to 100, got ${describe(v)}`);
      }
    }
  }

  if (r.total > before || !id || !kind || title === undefined || !mda || !status || !position) {
    return null;
  }
  const node: GameNode = {
    id,
    kind,
    title,
    description: description ?? '',
    mda,
    status,
    tags,
    params,
    position,
  };
  if (layer !== undefined) node.layer = layer;
  if (childGraphId !== undefined) node.childGraphId = childGraphId;
  if (aestheticType) node.aestheticType = aestheticType;
  if (resourceRole) node.resourceRole = resourceRole;
  if (ocean) node.ocean = ocean;
  if (contentCost) node.contentCost = contentCost;
  if (prototypeScope) node.prototypeScope = prototypeScope;
  if (returnHook !== undefined) node.returnHook = returnHook;
  return node;
}

function parseEdge(raw: unknown, path: string, r: Reader): GameEdge | null {
  if (!isRecord(raw)) {
    r.fail(path, 'expected an object');
    return null;
  }
  const before = r.total;
  const id = r.string(raw, 'id', path);
  const kind = r.choice(raw, 'kind', EDGE_KINDS, path);
  const source = r.string(raw, 'source', path);
  const target = r.string(raw, 'target', path);
  const label = r.string(raw, 'label', path, { optional: true });
  if (r.total > before || !id || !kind || !source || !target) return null;
  const edge: GameEdge = { id, kind, source, target };
  if (label !== undefined) edge.label = label;
  return edge;
}

function parseCustomKind(raw: unknown, path: string, r: Reader): CustomKind | null {
  if (!isRecord(raw)) {
    r.fail(path, 'expected an object');
    return null;
  }
  const before = r.total;
  const id = r.string(raw, 'id', path);
  const name = r.string(raw, 'name', path);
  const color = r.string(raw, 'color', path);
  const icon = r.string(raw, 'icon', path);
  const mda = r.choice(raw, 'mda', MDA_AXES, path);
  let layer: Layer | undefined;
  if (raw.layer !== undefined) {
    if (raw.layer === 0 || raw.layer === 1 || raw.layer === 2 || raw.layer === 3) layer = raw.layer;
    else r.fail(`${path}.layer`, `expected 0, 1, 2 or 3, got ${describe(raw.layer)}`);
  }
  if (r.total > before || !id || !name || !color || !icon || !mda) return null;
  const kind: CustomKind = { id, name, color, icon, mda };
  if (layer !== undefined) kind.layer = layer;
  return kind;
}

function parseViewPositions(raw: unknown, r: Reader): Project['viewPositions'] {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    r.fail('viewPositions', 'expected an object');
    return undefined;
  }
  const out: Partial<Record<PlacedView, Record<string, Point>>> = {};
  for (const view of ['onion', 'mda'] as const) {
    const byNode = raw[view];
    if (byNode === undefined) continue;
    if (!isRecord(byNode)) {
      r.fail(`viewPositions.${view}`, 'expected an object');
      continue;
    }
    const points: Record<string, Point> = {};
    for (const [id, value] of Object.entries(byNode)) {
      const p = r.point(value, `viewPositions.${view}.${id}`);
      if (p) points[id] = p;
    }
    out[view] = points;
  }
  return out;
}

function parseGdd(raw: unknown, r: Reader): Gdd | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) {
    r.fail('gdd', 'expected an object');
    return undefined;
  }
  const gdd: Gdd = { values: {}, enabled: {}, custom: [] };

  if (raw.values !== undefined) {
    if (!isRecord(raw.values)) r.fail('gdd.values', 'expected an object of text');
    else {
      for (const [id, v] of Object.entries(raw.values)) {
        if (typeof v === 'string') gdd.values[id] = v;
        else r.fail(`gdd.values.${id}`, `expected text, got ${describe(v)}`);
      }
    }
  }
  if (raw.enabled !== undefined) {
    if (!isRecord(raw.enabled)) r.fail('gdd.enabled', 'expected an object of true/false');
    else {
      for (const [id, v] of Object.entries(raw.enabled)) {
        if (typeof v === 'boolean') gdd.enabled[id] = v;
        else r.fail(`gdd.enabled.${id}`, `expected true or false, got ${describe(v)}`);
      }
    }
  }
  r.array(raw, 'custom', 'gdd', { optional: true }).forEach((item, i) => {
    const path = `gdd.custom[${i}]`;
    if (!isRecord(item)) return r.fail(path, 'expected an object');
    const id = r.string(item, 'id', path);
    const title = r.string(item, 'title', path);
    const body = r.string(item, 'body', path);
    if (id !== undefined && title !== undefined && body !== undefined) {
      gdd.custom.push({ id, title, body });
    }
  });
  return gdd;
}

// Reads a project from untrusted JSON. Collects readable errors instead of throwing.
export function parseProject(input: unknown): ParseResult {
  const r = new Reader();
  if (!isRecord(input)) return { ok: false, errors: ['The file is not a Ludograph project.'] };

  if (input.schemaVersion !== 1) {
    const got = describe(input.schemaVersion);
    return {
      ok: false,
      errors: [
        `schemaVersion: expected 1, got ${got}. The file may come from a newer version of Ludograph, or may not be a Ludograph project.`,
      ],
    };
  }

  const id = r.string(input, 'id', 'project');
  const name = r.string(input, 'name', 'project');
  const rootGraphId = r.string(input, 'rootGraphId', 'project');
  const designOrder = r.choice(input, 'designOrder', ['outsideIn', 'coreFirst'], 'project');
  if (input.coreOnly !== undefined && typeof input.coreOnly !== 'boolean') {
    r.fail('project.coreOnly', `expected true or false, got ${describe(input.coreOnly)}`);
  }

  const customKinds: CustomKind[] = [];
  r.array(input, 'customKinds', 'project', { optional: true }).forEach((k, i) => {
    const kind = parseCustomKind(k, `customKinds[${i}]`, r);
    if (kind) customKinds.push(kind);
  });

  const graphs: Record<string, Graph> = {};
  const nodeIds = new Set<string>();
  const nodeGraph = new Map<string, string>();

  if (!isRecord(input.graphs))
    r.fail('graphs', `expected an object, got ${describe(input.graphs)}`);
  else {
    for (const [key, rawGraph] of Object.entries(input.graphs)) {
      const gp = `graphs.${key}`;
      if (!isRecord(rawGraph)) {
        r.fail(gp, 'expected an object');
        continue;
      }
      const gid = r.string(rawGraph, 'id', gp);
      const gname = r.string(rawGraph, 'name', gp);
      const parentNodeId = r.string(rawGraph, 'parentNodeId', gp, { optional: true });
      if (gid !== undefined && gid !== key) {
        r.fail(`${gp}.id`, `is "${gid}" but the graph is stored under "${key}"`);
      }

      const nodes: GameNode[] = [];
      r.array(rawGraph, 'nodes', gp).forEach((rawNode, i) => {
        const node = parseNode(rawNode, `${gp}.nodes[${i}]`, r);
        if (!node) return;
        if (nodeIds.has(node.id)) r.fail(`${gp}.nodes[${i}].id`, `"${node.id}" is used twice`);
        nodeIds.add(node.id);
        nodeGraph.set(node.id, key);
        nodes.push(node);
      });

      const edges: GameEdge[] = [];
      const edgeIds = new Set<string>();
      r.array(rawGraph, 'edges', gp).forEach((rawEdge, i) => {
        const edge = parseEdge(rawEdge, `${gp}.edges[${i}]`, r);
        if (!edge) return;
        if (edgeIds.has(edge.id)) r.fail(`${gp}.edges[${i}].id`, `"${edge.id}" is used twice`);
        edgeIds.add(edge.id);
        edges.push(edge);
      });
      for (const [i, edge] of edges.entries()) {
        for (const end of ['source', 'target'] as const) {
          if (!nodes.some((n) => n.id === edge[end])) {
            r.fail(
              `${gp}.edges[${i}].${end}`,
              `points to "${edge[end]}", which is not a node in this graph`,
            );
          }
        }
      }

      if (gid !== undefined && gname !== undefined) {
        const graph: Graph = { id: gid, name: gname, nodes, edges };
        if (parentNodeId !== undefined) graph.parentNodeId = parentNodeId;
        graphs[key] = graph;
      }
    }

    if (rootGraphId !== undefined && !graphs[rootGraphId]) {
      r.fail('project.rootGraphId', `"${rootGraphId}" is not one of the graphs`);
    }
    for (const graph of Object.values(graphs)) {
      if (graph.parentNodeId !== undefined && !nodeIds.has(graph.parentNodeId)) {
        r.fail(`graphs.${graph.id}.parentNodeId`, `"${graph.parentNodeId}" is not a node`);
      }
      graph.nodes.forEach((node, i) => {
        if (node.childGraphId !== undefined && !graphs[node.childGraphId]) {
          r.fail(
            `graphs.${graph.id}.nodes[${i}].childGraphId`,
            `"${node.childGraphId}" is not one of the graphs`,
          );
        }
      });
    }
  }

  const viewPositions = parseViewPositions(input.viewPositions, r);
  const gdd = parseGdd(input.gdd, r);

  if (r.total > 0) {
    const more = r.total - r.errors.length;
    return { ok: false, errors: more > 0 ? [...r.errors, `...and ${more} more.`] : r.errors };
  }
  if (!id || !name || !rootGraphId || !designOrder)
    return { ok: false, errors: ['Invalid project.'] };

  const project: Project = {
    schemaVersion: 1,
    id,
    name,
    rootGraphId,
    designOrder,
    graphs,
    customKinds,
  };
  if (viewPositions) project.viewPositions = viewPositions;
  if (input.coreOnly === true) project.coreOnly = true;
  if (gdd) project.gdd = gdd;
  return { ok: true, project };
}

export function parseProjectText(text: string): ParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, errors: [`The file is not valid JSON (${reason}).`] };
  }
  return parseProject(value);
}
