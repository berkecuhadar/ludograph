import { strings } from '../lib/strings';
import { useUiStore, type ViewName } from '../store/uiStore';
import './Toolbar.css';

const VIEWS: ViewName[] = ['graph', 'onion', 'mda'];

export function ViewSwitcher() {
  const view = useUiStore((s) => s.view);
  const setView = useUiStore((s) => s.setView);

  return (
    <div className="segmented" role="group" aria-label={strings.views.label}>
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={view === v}
          title={strings.views.hint[v]}
          onClick={() => setView(v)}
        >
          {strings.views[v]}
        </button>
      ))}
    </div>
  );
}
