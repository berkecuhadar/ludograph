import { useEffect } from 'react';
import { graphPath } from '../model/graphOps';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { isCanvasTarget, isTypingTarget, matchShortcut, type ShortcutAction } from './shortcutKeys';

function run(action: ShortcutAction) {
  const project = useProjectStore.getState();
  const ui = useUiStore.getState();

  switch (action) {
    case 'quickAdd':
      return ui.setDialog('quickAdd');
    case 'help':
      return ui.setDialog('help');
    case 'undo':
      return project.undo();
    case 'redo':
      return project.redo();
    case 'copy':
      return project.copyNodes(ui.selectedNodeIds);
    case 'paste':
      return ui.requestSelect(project.paste());
    case 'duplicate':
      return ui.requestSelect(project.duplicateNodes(ui.selectedNodeIds));
    case 'search':
      return ui.setDialog('search');
    case 'openInside': {
      const [only] = ui.selectedNodeIds;
      if (ui.selectedNodeIds.length === 1 && only) project.openNode(only);
      return;
    }
    case 'goUp': {
      const path = graphPath(project.project, project.activeGraphId);
      const parent = path[path.length - 2];
      if (parent) project.setActiveGraph(parent.graphId);
      return;
    }
    case 'selectAll': {
      const graph = project.project.graphs[project.activeGraphId];
      return ui.requestSelect(graph?.nodes.map((n) => n.id) ?? []);
    }
  }
}

export function Shortcuts() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || useUiStore.getState().dialog) return;
      const action = matchShortcut(e);
      if (!action) return;
      // The document view has no canvas to act on, so only the help list works there.
      if (useUiStore.getState().mode === 'document' && action !== 'help') return;
      if (action === 'openInside' && !isCanvasTarget(e.target)) return;
      e.preventDefault();
      run(action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return null;
}
