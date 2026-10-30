import { useReactFlow } from '@xyflow/react';
import { useCallback } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import type { PaletteEntry } from './paletteGroups';

// Adds a node near the middle of the visible canvas and selects it. Must be used
// inside the ReactFlowProvider.
export function useAddNode() {
  const { screenToFlowPosition } = useReactFlow();

  return useCallback(
    (entry: PaletteEntry) => {
      const { project, activeGraphId, addNode } = useProjectStore.getState();
      const area = document.querySelector('.canvas')?.getBoundingClientRect();
      const center = area
        ? { x: area.left + area.width / 2, y: area.top + area.height / 2 }
        : { x: 400, y: 300 };
      // Nudge by node count so repeated adds don't land on top of each other.
      const nudge = ((project.graphs[activeGraphId]?.nodes.length ?? 0) % 8) * 24;
      const position = screenToFlowPosition({ x: center.x + nudge, y: center.y + nudge });
      const id = addNode(entry.kind, position, entry.overrides);
      useUiStore.getState().requestSelect([id]);
    },
    [screenToFlowPosition],
  );
}
