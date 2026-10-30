import { create } from 'zustand';
import { newId } from '../lib/id';
import { createNode, createProject } from '../model/factory';
import {
  extractSnippet,
  instantiateSnippet,
  removeNodes,
  updateGraph,
  type Snippet,
} from '../model/graphOps';
import type { GameEdge, GameNode, NodeKind, Project } from '../model/types';

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1000;
const PASTE_OFFSET = { x: 32, y: 32 };

type Point = { x: number; y: number };
type EditOptions = {
  /** Edits with the same key in quick succession share one undo step (typing, dragging). */
  coalesce?: string;
};

type ProjectState = {
  project: Project;
  activeGraphId: string;
  past: Project[];
  future: Project[];
  lastEditKey: string | null;
  lastEditAt: number;
  clipboard: Snippet | null;

  loadProject: (project: Project) => void;
  addNode: (kind: NodeKind, position: Point, overrides?: Partial<GameNode>) => string;
  updateNode: (id: string, patch: Partial<GameNode>, options?: EditOptions) => void;
  moveNodes: (positions: Record<string, Point>) => void;
  removeNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => string[];
  copyNodes: (ids: string[]) => void;
  paste: () => string[];
  addEdge: (edge: Omit<GameEdge, 'id'>) => string;
  updateEdge: (id: string, patch: Partial<Omit<GameEdge, 'id'>>) => void;
  removeEdges: (ids: string[]) => void;
  undo: () => void;
  redo: () => void;
};

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

  const initial = createProject();

  return {
    project: initial,
    activeGraphId: initial.rootGraphId,
    past: [],
    future: [],
    lastEditKey: null,
    lastEditAt: 0,
    clipboard: null,

    loadProject: (project) =>
      set({
        project,
        activeGraphId: project.rootGraphId,
        past: [],
        future: [],
        lastEditKey: null,
        clipboard: null,
      }),

    addNode: (kind, position, overrides) => {
      const node = createNode(kind, position, get().project.customKinds, overrides);
      editGraph((g) => ({ ...g, nodes: [...g.nodes, node] }));
      return node.id;
    },

    updateNode: (id, patch, options) =>
      editGraph(
        (g) => ({ ...g, nodes: g.nodes.map((n) => (n.id === id ? { ...n, ...patch, id } : n)) }),
        options,
      ),

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

    removeNodes: (ids) => editGraph((g) => removeNodes(g, new Set(ids))),

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

    updateEdge: (id, patch) =>
      editGraph((g) => ({
        ...g,
        edges: g.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),

    removeEdges: (ids) => {
      const drop = new Set(ids);
      editGraph((g) => ({ ...g, edges: g.edges.filter((e) => !drop.has(e.id)) }));
    },

    undo: () => {
      const { past, project, future } = get();
      const previous = past[past.length - 1];
      if (!previous) return;
      set({
        project: previous,
        past: past.slice(0, -1),
        future: [project, ...future],
        lastEditKey: null,
      });
    },

    redo: () => {
      const { past, project, future } = get();
      const next = future[0];
      if (!next) return;
      set({
        project: next,
        past: [...past, project],
        future: future.slice(1),
        lastEditKey: null,
      });
    },
  };
});
