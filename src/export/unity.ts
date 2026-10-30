import type { Project } from '../model/types';

// Flat data for Unity. Unity's JsonUtility has no null, no unions and no optional
// fields, so missing values use fixed fallbacks: -1 for numbers, "" for text.
export type UnityParam = { key: string; value: string; valueType: 'string' | 'number' | 'boolean' };

export type UnityNode = {
  id: string;
  graphId: string;
  kind: string;
  title: string;
  description: string;
  mda: string;
  /** 0 to 3, or -1 when the node is outside the onion. */
  layer: number;
  status: string;
  tags: string[];
  params: UnityParam[];
  x: number;
  y: number;
  childGraphId: string;
  aestheticType: string;
  resourceRole: string;
  contentCost: string;
  prototypeScope: string;
  returnHook: string;
  /** 0 to 100 each, or -1 when not set. */
  oceanO: number;
  oceanC: number;
  oceanE: number;
  oceanA: number;
  oceanN: number;
};

export type UnityEdge = {
  id: string;
  graphId: string;
  kind: string;
  source: string;
  target: string;
  label: string;
};

export type UnityGraph = { id: string; name: string; parentNodeId: string };

export type UnityExport = {
  schemaVersion: number;
  projectId: string;
  name: string;
  designOrder: string;
  coreOnly: boolean;
  graphs: UnityGraph[];
  nodes: UnityNode[];
  edges: UnityEdge[];
};

export function toUnity(project: Project): UnityExport {
  const graphs = Object.values(project.graphs);
  return {
    schemaVersion: 1,
    projectId: project.id,
    name: project.name,
    designOrder: project.designOrder,
    coreOnly: project.coreOnly === true,
    graphs: graphs.map((g) => ({ id: g.id, name: g.name, parentNodeId: g.parentNodeId ?? '' })),
    nodes: graphs.flatMap((g) =>
      g.nodes.map((n) => ({
        id: n.id,
        graphId: g.id,
        kind: n.kind,
        title: n.title,
        description: n.description,
        mda: n.mda,
        layer: n.layer ?? -1,
        status: n.status,
        tags: [...n.tags],
        params: n.params.map((p) => ({
          key: p.key,
          value: String(p.value),
          valueType: typeof p.value as UnityParam['valueType'],
        })),
        x: n.position.x,
        y: n.position.y,
        childGraphId: n.childGraphId ?? '',
        aestheticType: n.aestheticType ?? '',
        resourceRole: n.resourceRole ?? '',
        contentCost: n.contentCost ?? '',
        prototypeScope: n.prototypeScope ?? '',
        returnHook: n.returnHook ?? '',
        oceanO: n.ocean?.o ?? -1,
        oceanC: n.ocean?.c ?? -1,
        oceanE: n.ocean?.e ?? -1,
        oceanA: n.ocean?.a ?? -1,
        oceanN: n.ocean?.n ?? -1,
      })),
    ),
    edges: graphs.flatMap((g) =>
      g.edges.map((e) => ({
        id: e.id,
        graphId: g.id,
        kind: e.kind,
        source: e.source,
        target: e.target,
        label: e.label ?? '',
      })),
    ),
  };
}

export function exportUnityJson(project: Project): string {
  return `${JSON.stringify(toUnity(project), null, 2)}\n`;
}
