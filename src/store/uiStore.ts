import { create } from 'zustand';

export type DialogName = 'quickAdd' | 'help';

// Asks the canvas to select exactly these nodes. A new object each time, so
// asking for the same ids twice still counts as a change.
export type SelectRequest = { ids: string[] };

type UiState = {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  selectRequest: SelectRequest | null;
  dialog: DialogName | null;
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
  requestSelect: (ids: string[]) => void;
  setDialog: (dialog: DialogName | null) => void;
};

const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export const useUiStore = create<UiState>()((set, get) => ({
  selectedNodeIds: [],
  selectedEdgeIds: [],
  selectRequest: null,
  dialog: null,
  setSelection: (nodeIds, edgeIds) => {
    const { selectedNodeIds, selectedEdgeIds } = get();
    if (same(nodeIds, selectedNodeIds) && same(edgeIds, selectedEdgeIds)) return;
    set({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds });
  },
  requestSelect: (ids) => set({ selectRequest: { ids } }),
  setDialog: (dialog) => set({ dialog }),
}));
