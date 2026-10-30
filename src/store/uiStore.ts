import { create } from 'zustand';

type UiState = {
  selectedNodeIds: string[];
  selectedEdgeIds: string[];
  setSelection: (nodeIds: string[], edgeIds: string[]) => void;
};

const same = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export const useUiStore = create<UiState>()((set, get) => ({
  selectedNodeIds: [],
  selectedEdgeIds: [],
  setSelection: (nodeIds, edgeIds) => {
    const { selectedNodeIds, selectedEdgeIds } = get();
    if (same(nodeIds, selectedNodeIds) && same(edgeIds, selectedEdgeIds)) return;
    set({ selectedNodeIds: nodeIds, selectedEdgeIds: edgeIds });
  },
}));
