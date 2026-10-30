import { create } from 'zustand';
import type { EdgeKind, Status } from '../model/types';

export type DialogName =
  'quickAdd' | 'help' | 'settings' | 'connect' | 'search' | 'errors' | 'confirm';

export type ViewName = 'graph' | 'onion' | 'mda';
export type SidebarTab = 'inspector' | 'path' | 'validation';

// Asks the canvas to select exactly these nodes. A new object each time, so
// asking for the same ids twice still counts as a change.
export type SelectRequest = { ids: string[] };

// Asks the canvas to scroll a node into view. Same idea as SelectRequest.
export type FocusRequest = { nodeId: string };

export type PendingConnection = { source: string; target: string };

export type Filter = { statuses: Status[]; tag: string | null };

type UiState = {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  selectRequest: SelectRequest | null;
  focusRequest: FocusRequest | null;
  dialog: DialogName | null;

  view: ViewName;
  sidebarTab: SidebarTab;
  sidebarOpen: boolean;
  /** Design Path step the canvas is narrowed to. */
  pathStep: string | null;
  filter: Filter;

  pendingConnection: PendingConnection | null;
  lastEdgeKind: EdgeKind;
  notice: { id: number; text: string } | null;
  confirm: { message: string; okLabel?: string } | null;
  importErrors: string[];

  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  requestSelect: (ids: string[]) => void;
  requestFocus: (nodeId: string) => void;
  setDialog: (dialog: DialogName | null) => void;
  setView: (view: ViewName) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setSidebarOpen: (open: boolean) => void;
  setPathStep: (step: string | null) => void;
  setFilter: (filter: Filter) => void;
  startConnect: (connection: PendingConnection) => void;
  setLastEdgeKind: (kind: EdgeKind) => void;
  notify: (text: string) => void;
  clearNotice: () => void;
  showImportErrors: (errors: string[]) => void;
  /** Resolves true if the user confirms, false if they cancel or close the dialog. */
  askConfirm: (message: string, okLabel?: string) => Promise<boolean>;
  resolveConfirm: (ok: boolean) => void;
};

const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

let confirmResolver: ((ok: boolean) => void) | null = null;
let noticeCounter = 0;

export const useUiStore = create<UiState>()((set, get) => ({
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectRequest: null,
  focusRequest: null,
  dialog: null,

  view: 'graph',
  sidebarTab: 'inspector',
  sidebarOpen: true,
  pathStep: null,
  filter: { statuses: [], tag: null },

  pendingConnection: null,
  lastEdgeKind: 'feeds',
  notice: null,
  confirm: null,
  importErrors: [],

  setSelection: (nodeIds, edgeIds) => {
    const { selectedNodeIds, selectedEdgeIds } = get();
    if (same(nodeIds, selectedNodeIds) && same(edgeIds, selectedEdgeIds)) return;
    set({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds });
  },
  requestSelect: (ids) => set({ selectRequest: { ids } }),
  requestFocus: (nodeId) => set({ focusRequest: { nodeId } }),
  setDialog: (dialog) => set({ dialog }),
  setView: (view) => set({ view }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab, sidebarOpen: true }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setPathStep: (pathStep) => set({ pathStep }),
  setFilter: (filter) => set({ filter }),
  startConnect: (pendingConnection) => set({ pendingConnection, dialog: 'connect' }),
  setLastEdgeKind: (lastEdgeKind) => set({ lastEdgeKind }),
  notify: (text) => set({ notice: { id: ++noticeCounter, text } }),
  clearNotice: () => set({ notice: null }),
  showImportErrors: (importErrors) => set({ importErrors, dialog: 'errors' }),

  askConfirm: (message, okLabel) =>
    new Promise<boolean>((resolve) => {
      confirmResolver?.(false);
      confirmResolver = resolve;
      set({ confirm: okLabel ? { message, okLabel } : { message }, dialog: 'confirm' });
    }),
  resolveConfirm: (ok) => {
    const resolve = confirmResolver;
    confirmResolver = null;
    if (!resolve) return;
    resolve(ok);
    set({ confirm: null, dialog: get().dialog === 'confirm' ? null : get().dialog });
  },
}));
