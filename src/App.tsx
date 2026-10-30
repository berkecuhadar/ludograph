import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { HelpDialog } from './components/HelpDialog';
import { Palette } from './components/Palette';
import { QuickAdd } from './components/QuickAdd';
import { Shortcuts } from './components/Shortcuts';
import { strings } from './lib/strings';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';

export function App() {
  const projectName = useProjectStore((s) => s.project.name);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const setDialog = useUiStore((s) => s.setDialog);

  return (
    <ReactFlowProvider>
      <div className="app">
        <header className="app-header">
          <strong>{strings.app.name}</strong>
          <span className="app-project">{projectName}</span>
          <span className="app-spacer" />
          <button type="button" onClick={undo} disabled={!canUndo}>
            {strings.header.undo}
          </button>
          <button type="button" onClick={redo} disabled={!canRedo}>
            {strings.header.redo}
          </button>
          <button type="button" onClick={() => setDialog('help')}>
            {strings.header.help}
          </button>
        </header>
        <div className="app-body">
          <Palette />
          <Canvas />
        </div>
      </div>
      <Shortcuts />
      <QuickAdd />
      <HelpDialog />
    </ReactFlowProvider>
  );
}
