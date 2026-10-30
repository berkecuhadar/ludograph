import { strings } from '../lib/strings';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';

export function Header() {
  const projectName = useProjectStore((s) => s.project.name);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const setDialog = useUiStore((s) => s.setDialog);

  return (
    <header className="app-header">
      <strong>{strings.app.name}</strong>
      <span className="app-project">{projectName}</span>
      <span className="app-spacer" />
      <button type="button" onClick={() => setDialog('search')}>
        {strings.header.search}
      </button>
      <button type="button" onClick={undo} disabled={!canUndo}>
        {strings.header.undo}
      </button>
      <button type="button" onClick={redo} disabled={!canRedo}>
        {strings.header.redo}
      </button>
      <button type="button" onClick={() => setDialog('settings')}>
        {strings.header.settings}
      </button>
      <button type="button" onClick={() => setDialog('help')}>
        {strings.header.help}
      </button>
    </header>
  );
}
