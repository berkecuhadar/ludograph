import { create } from 'zustand';
import { applyBatch as runBatch, type Batch, type BatchResult } from '../cli/batch';
import { newId } from '../lib/id';
import { strings } from '../lib/strings';
import { emptyGdd } from '../gdd/sections';
import { checkEdge, type EdgeCheck } from '../model/edgeRules';
import { autoLayout } from '../views/autoLayout';
import { createNode, createProject } from '../model/factory';
import {
  ensureChildGraph,
  extractSnippet,
  instantiateSnippet,
  patchNode,
  removeNodesFromProject,
  updateGraph,
  type Snippet,
} from '../model/graphOps';
import type {
  CustomKind,
  DesignOrder,
  EdgeKind,
  Gdd,
  GddSection,
  GameEdge,
  GameNode,
  NodeKind,
  PlacedView,
  Point,
  Project,
} from '../model/types';

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1000;
const PASTE_OFFSET = { x: 32, y: 32 };

type EditOptions = {
  /** Edits with the same key in quick succession share one undo step (typing, dragging). */
  coalesce?: string;
};

export type ConnectResult = { ok: true; id: string } | { ok: false; reason: string };

type ProjectState = {
  project: Project;
  activeGraphId: string;
  past: Project[];
  future: Project[];
  lastEditKey: string | null;
  lastEditAt: number;
  clipboard: Snippet | null;

  loadProject: (project: Project) => void;
  /** Adds or updates nodes and edges from a batch in one undo step. Nothing changes on errors. */
  applyBatch: (batch: Batch) => BatchResult;
  setProjectName: (name: string) => void;
  setDesignOrder: (order: DesignOrder) => void;
  setCoreOnly: (on: boolean) => void;

  /** Replaces the whole written document. */
  setGdd: (gdd: Gdd) => void;
  setGddValue: (fieldId: string, value: string) => void;
  setGddEnabled: (groupId: string, on: boolean) => void;
  addCustomSection: () => string;
  /** Adds pillar nodes to the main graph, below what is already there. Returns how many. */
  addPillarNodes: (titles: string[]) => number;
  updateCustomSection: (id: string, patch: Partial<Omit<GddSection, 'id'>>) => void;
  removeCustomSection: (id: string) => void;

  setActiveGraph: (graphId: string) => void;
  /** Goes inside a node, creating its inner graph the first time. */
  openNode: (nodeId: string) => void;

  addNode: (kind: NodeKind, position: Point, overrides?: Partial<GameNode>) => string;
  updateNode: (id: string, patch: Partial<GameNode>, options?: EditOptions) => void;
  /** Changes several nodes in one undo step. */
  updateNodes: (patches: Record<string, Partial<GameNode>>) => void;
  moveNodes: (positions: Record<string, Point>) => void;
  /** Arranges the nodes of the current graph along their edges, as one undo step. */
  autoLayout: () => void;
  setViewPositions: (view: PlacedView, positions: Record<string, Point>) => void;
  removeNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => string[];
  copyNodes: (ids: string[]) => void;
  paste: () => string[];

  /** Adds an edge without checking the rules. Used for imports and seeds. */
  addEdge: (edge: Omit<GameEdge, 'id'>) => string;
  /** Adds an edge if the rules allow it. */
  connectNodes: (source: string, target: string, kind: EdgeKind) => ConnectResult;
  updateEdge: (id: string, patch: Partial<Omit<GameEdge, 'id'>>, options?: EditOptions) => void;
  setEdgeKind: (id: string, kind: EdgeKind) => EdgeCheck;
  removeEdges: (ids: string[]) => void;

  addCustomKind: (kind: Omit<CustomKind, 'id'>) => string;
  updateCustomKind: (id: string, patch: Partial<Omit<CustomKind, 'id'>>) => void;
  removeCustomKind: (id: string) => void;

  undo: () => void;
  redo: () => void;
};

function slug(name: string, taken: string[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'kind';
  let id = base;
  for (let i = 2; taken.includes(id); i++) id = `${base}-${i}`;
  return id;
}

export const useProjectStore = create<ProjectState>()((set, get) => {
  // Every edit goes through here so history stays consistent.
  const commit = (next: Project, options: EditOptions = {}) => {
    const { project, past, lastEditKey, lastEditAt } = get();
    const now = Date.now();
    const key = options.coalesce ?? null;
    const merge = key !== null && key === lastEditKey && now - lastEditAt < COALESCE_MS;
    set({
      project: next,
      past: merge ? past : [...past, project].slice(-HISTORY_LIMIT),
      future: [],
      lastEditKey: key,
      lastEditAt: now,
    });
  };

  const editGraph = (fn: Parameters<typeof updateGraph>[2], options?: EditOptions) => {
    const { project, activeGraphId } = get();
    commit(updateGraph(project, activeGraphId, fn), options);
  };

  // After undo or redo the graph we were looking at may not exist any more.
  const restore = (project: Project, past: Project[], future: Project[]) => {
    const { activeGraphId } = get();
    set({
      project,
      past,
      future,
      lastEditKey: null,
      activeGraphId: project.graphs[activeGraphId] ? activeGraphId : project.rootGraphId,
    });
  };

  const initial = createProject();

  return {
    project: initial,
    activeGraphId: initial.rootGraphId,
    past: [],
    future: [],
    lastEditKey: null,
    lastEditAt: 0,
    clipboard: null,

    applyBatch: (batch) => {
      const result = runBatch(get().project, batch);
      if (result.ok) commit(result.project);
      return result;
    },

    loadProject: (project) =>
      set({
        project,
        activeGraphId: project.rootGraphId,
        past: [],
        future: [],
        lastEditKey: null,
        clipboard: null,
      }),

    setProjectName: (name) => commit({ ...get().project, name }, { coalesce: 'project-name' }),
    setDesignOrder: (designOrder) => commit({ ...get().project, designOrder }),
    setCoreOnly: (coreOnly) => commit({ ...get().project, coreOnly }),

    setGdd: (gdd) => commit({ ...get().project, gdd }),

    setGddValue: (fieldId, value) => {
      const { project } = get();
      const gdd = project.gdd ?? emptyGdd();
      commit(
        { ...project, gdd: { ...gdd, values: { ...gdd.values, [fieldId]: value } } },
        { coalesce: `gdd:${fieldId}` },
      );
    },

    setGddEnabled: (groupId, on) => {
      const { project } = get();
      const gdd = project.gdd ?? emptyGdd();
      commit({ ...project, gdd: { ...gdd, enabled: { ...gdd.enabled, [groupId]: on } } });
    },

    addCustomSection: () => {
      const { project } = get();
      const gdd = project.gdd ?? emptyGdd();
      const id = newId('c');
      commit({ ...project, gdd: { ...gdd, custom: [...gdd.custom, { id, title: '', body: '' }] } });
      return id;
    },

    addPillarNodes: (titles) => {
      if (titles.length === 0) return 0;
      const { project } = get();
      const root = project.graphs[project.rootGraphId];
      if (!root) return 0;
      const y = root.nodes.length > 0 ? Math.max(...root.nodes.map((n) => n.position.y)) + 200 : 0;
      const nodes = titles.map((title, i) =>
        createNode('pillar', { x: i * 260, y }, project.customKinds, { title }),
      );
      commit(updateGraph(project, root.id, (g) => ({ ...g, nodes: [...g.nodes, ...nodes] })));
      return nodes.length;
    },

    updateCustomSection: (id, patch) => {
      const { project } = get();
      const gdd = project.gdd ?? emptyGdd();
      const custom = gdd.custom.map((c) => (c.id === id ? { ...c, ...patch } : c));
      commit({ ...project, gdd: { ...gdd, custom } }, { coalesce: `gdd-custom:${id}` });
    },

    removeCustomSection: (id) => {
      const { project } = get();
      const gdd = project.gdd ?? emptyGdd();
      commit({ ...project, gdd: { ...gdd, custom: gdd.custom.filter((c) => c.id !== id) } });
    },

    setActiveGraph: (graphId) => {
      if (get().project.graphs[graphId]) set({ activeGraphId: graphId });
    },

    openNode: (nodeId) => {
      const { project, activeGraphId } = get();
      const result = ensureChildGraph(project, activeGraphId, nodeId);
      if (!result) return;
      if (result.project !== project) commit(result.project);
      set({ activeGraphId: result.childGraphId });
    },

    addNode: (kind, position, overrides) => {
      const node = createNode(kind, position, get().project.customKinds, overrides);
      editGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
      return node.id;
    },

    updateNode: (id, patch, options) =>
      editGraph(
        (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? patchNode(n, patch) : n)) }),
        options,
      ),

    updateNodes: (patches) =>
      editGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => {
          const patch = patches[n.id];
          return patch ? patchNode(n, patch) : n;
        }),
      })),

    moveNodes: (positions) =>
      editGraph(
        (g) => ({
          ...g,
          nodes: g.nodes.map((n) => {
            const position = positions[n.id];
            return position ? { ...n, position } : n;
          }),
        }),
        { coalesce: 'move' },
      ),

    autoLayout: () => {
      const { project, activeGraphId } = get();
      const graph = project.graphs[activeGraphId];
      if (!graph || graph.nodes.length === 0) return;
      const positions = autoLayout(graph.nodes, graph.edges);
      editGraph((g) => ({
        ...g,
        nodes: g.nodes.map((n) => ({ ...n, position: positions[n.id] ?? n.position })),
      }));
    },

    setViewPositions: (view, positions) => {
      const { project } = get();
      const current = project.viewPositions ?? {};
      commit(
        { ...project, viewPositions: { ...current, [view]: { ...current[view], ...positions } } },
        { coalesce: `move-${view}` },
      );
    },

    removeNodes: (ids) => {
      const { project, activeGraphId } = get();
      commit(removeNodesFromProject(project, activeGraphId, new Set(ids)));
    },

    duplicateNodes: (ids) => {
      const { project, activeGraphId } = get();
      const graph = project.graphs[activeGraphId];
      if (!graph) return [];
      const copy = instantiateSnippet(extractSnippet(graph, new Set(ids)), PASTE_OFFSET);
      if (copy.nodes.length === 0) return [];
      editGraph((g) => ({
        ...g,
        nodes: [...g.nodes, ...copy.nodes],
        edges: [...g.edges, ...copy.edges],
      }));
      return copy.nodes.map((n) => n.id);
    },

    copyNodes: (ids) => {
      const { project, activeGraphId } = get();
      const graph = project.graphs[activeGraphId];
      if (!graph) return;
      const snippet = extractSnippet(graph, new Set(ids));
      if (snippet.nodes.length > 0) set({ clipboard: snippet });
    },

    paste: () => {
      const { clipboard } = get();
      if (!clipboard) return [];
      const copy = instantiateSnippet(clipboard, PASTE_OFFSET);
      editGraph((g) => ({
        ...g,
        nodes: [...g.nodes, ...copy.nodes],
        edges: [...g.edges, ...copy.edges],
      }));
      // Shift the clipboard so repeated pastes don't stack on the same spot.
      set({
        clipboard: {
          ...clipboard,
          nodes: clipboard.nodes.map((n) => ({
            ...n,
            position: { x: n.position.x + PASTE_OFFSET.x, y: n.position.y + PASTE_OFFSET.y },
          })),
        },
      });
      return copy.nodes.map((n) => n.id);
    },

    addEdge: (edge) => {
      const id = newId('e');
      editGraph((g) => ({ ...g, edges: [...g.edges, { ...edge, id }] }));
      return id;
    },

    connectNodes: (source, target, kind) => {
      const { project, activeGraphId } = get();
      const graph = project.graphs[activeGraphId];
      const from = graph?.nodes.find((n) => n.id === source);
      const to = graph?.nodes.find((n) => n.id === target);
      if (!graph || !from || !to) return { ok: false, reason: strings.edgeErrors.missing };
      const check = checkEdge(kind, from, to, project.customKinds, graph.edges);
      if (!check.ok) return check;
      const id = newId('e');
      editGraph((g) => ({ ...g, edges: [...g.edges, { id, kind, source, target }] }));
      return { ok: true, id };
    },

    updateEdge: (id, patch, options) =>
      editGraph(
        (g) => ({ ...g, edges: g.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }),
        options,
      ),

    setEdgeKind: (id, kind) => {
      const { project, activeGraphId } = get();
      const graph = project.graphs[activeGraphId];
      const edge = graph?.edges.find((e) => e.id === id);
      const from = graph?.nodes.find((n) => n.id === edge?.source);
      const to = graph?.nodes.find((n) => n.id === edge?.target);
      if (!graph || !edge || !from || !to) return { ok: false, reason: strings.edgeErrors.missing };
      const check = checkEdge(kind, from, to, project.customKinds, graph.edges, id);
      if (check.ok) {
        editGraph((g) => ({ ...g, edges: g.edges.map((e) => (e.id === id ? { ...e, kind } : e)) }));
      }
      return check;
    },

    removeEdges: (ids) => {
      const drop = new Set(ids);
      editGraph((g) => ({ ...g, edges: g.edges.filter((e) => !drop.has(e.id)) }));
    },

    addCustomKind: (kind) => {
      const { project } = get();
      const id = slug(
        kind.name,
        project.customKinds.map((k) => k.id),
      );
      commit({ ...project, customKinds: [...project.customKinds, { ...kind, id }] });
      return id;
    },

    updateCustomKind: (id, patch) => {
      const { project } = get();
      const customKinds = project.customKinds.map((k) => {
        if (k.id !== id) return k;
        const next: CustomKind = { ...k, ...patch };
        if ('layer' in patch && patch.layer === undefined) delete next.layer;
        return next;
      });
      commit({ ...project, customKinds });
    },

    removeCustomKind: (id) => {
      const { project } = get();
      commit({ ...project, customKinds: project.customKinds.filter((k) => k.id !== id) });
    },

    undo: () => {
      const { past, project, future } = get();
      const previous = past[past.length - 1];
      if (previous) restore(previous, past.slice(0, -1), [project, ...future]);
    },

    redo: () => {
      const { past, project, future } = get();
      const next = future[0];
      if (next) restore(next, [...past, project], future.slice(1));
    },
  };
});
