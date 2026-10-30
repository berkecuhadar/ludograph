export const MDA_AXES = ['mechanics', 'dynamics', 'aesthetics'] as const;
export type Mda = (typeof MDA_AXES)[number];

export type Layer = 0 | 1 | 2 | 3;

export const BUILTIN_KINDS = [
  'pillar',
  'aesthetic',
  'persona',
  'dynamic',
  'coreLoop',
  'mechanic',
  'subMechanic',
  'action',
  'resource',
  'item',
  'entity',
  'state',
  'event',
  'rule',
  'progression',
  'narrative',
  'note',
] as const;
export type BuiltinKind = (typeof BUILTIN_KINDS)[number];
export type NodeKind = BuiltinKind | `custom:${string}`;

export const STATUSES = ['idea', 'designed', 'prototyped', 'implemented', 'cut'] as const;
export type Status = (typeof STATUSES)[number];

export const AESTHETIC_TYPES = [
  'sensation',
  'fantasy',
  'narrative',
  'challenge',
  'fellowship',
  'discovery',
  'expression',
  'submission',
] as const;
export type AestheticType = (typeof AESTHETIC_TYPES)[number];

export const RESOURCE_ROLES = ['pool', 'source', 'sink', 'converter'] as const;
export type ResourceRole = (typeof RESOURCE_ROLES)[number];

export const CONTENT_COSTS = ['low', 'medium', 'high'] as const;
export type ContentCost = (typeof CONTENT_COSTS)[number];

export const PROTOTYPE_SCOPES = ['full', 'stub', 'skip'] as const;
export type PrototypeScope = (typeof PROTOTYPE_SCOPES)[number];

export type Ocean = { o: number; c: number; e: number; a: number; n: number };

export type Param = { key: string; value: string | number | boolean };

export type GameNode = {
  id: string;
  kind: NodeKind;
  title: string;
  /** Markdown. */
  description: string;
  /** Defaulted from the kind, editable per node. */
  mda: Mda;
  /** Onion layer. Undefined for kinds that live outside the onion. */
  layer?: Layer;
  status: Status;
  tags: string[];
  params: Param[];
  position: { x: number; y: number };
  childGraphId?: string;

  aestheticType?: AestheticType;
  resourceRole?: ResourceRole;
  /** Each value 0..100. */
  ocean?: Partial<Ocean>;
  contentCost?: ContentCost;
  prototypeScope?: PrototypeScope;
  returnHook?: string;
};

export const EDGE_KINDS = [
  'feeds',
  'requires',
  'unlocks',
  'triggers',
  'modifies',
  'conflicts',
  'leadsTo',
  'serves',
] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];

export type GameEdge = {
  id: string;
  kind: EdgeKind;
  source: string;
  target: string;
  label?: string;
};

export type CustomKind = {
  id: string;
  name: string;
  color: string;
  icon: string;
  mda: Mda;
  layer?: Layer;
};

export type Graph = {
  id: string;
  name: string;
  /** The node this graph is the inside of. */
  parentNodeId?: string;
  nodes: GameNode[];
  edges: GameEdge[];
};

export type DesignOrder = 'outsideIn' | 'coreFirst';

export type Project = {
  schemaVersion: 1;
  id: string;
  name: string;
  rootGraphId: string;
  designOrder: DesignOrder;
  /** One graph per drill-down level. */
  graphs: Record<string, Graph>;
  customKinds: CustomKind[];
};
