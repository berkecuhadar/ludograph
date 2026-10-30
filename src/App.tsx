import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './components/Canvas';
import { Palette } from './components/Palette';
import { strings } from './lib/strings';
import { useProjectStore } from './store/projectStore';

export function App() {
  const projectName = useProjectStore((s) => s.project.name);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);

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
        </header>
        <div className="app-body">
          <Palette />
          <Canvas />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
