import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

// Switches to the graph that holds a node, selects it and scrolls it into view.
export function goToNode(graphId: string, nodeId: string) {
  const ui = useUiStore.getState();
  ui.requestSelect([nodeId]);
  ui.requestFocus(nodeId);
  useProjectStore.getState().setActiveGraph(graphId);
  ui.setDialog(null);
}
