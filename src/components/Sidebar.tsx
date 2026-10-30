import { strings } from '../lib/strings';
import { useUiStore, type SidebarTab } from '../store/uiStore';
import { useValidationStore } from '../store/validationStore';
import { DesignPathPanel } from './DesignPathPanel';
import { Inspector } from './inspector/Inspector';
import { ValidationPanel } from './ValidationPanel';
import './Sidebar.css';

const TABS: SidebarTab[] = ['inspector', 'path', 'validation'];

export function Sidebar() {
  const open = useUiStore((s) => s.sidebarOpen);
  const setOpen = useUiStore((s) => s.setSidebarOpen);
  const tab = useUiStore((s) => s.sidebarTab);
  const setTab = useUiStore((s) => s.setSidebarTab);
  const t = strings.sidebar;
  const issueCount = useValidationStore((s) => s.issues.length);

  if (!open) {
    return (
      <aside className="sidebar sidebar-collapsed">
        <button type="button" onClick={() => setOpen(true)} aria-label={t.expand} title={t.expand}>
          &laquo;
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar" aria-label="Side panel">
      <div className="sidebar-head">
        <div className="sidebar-tabs" role="tablist">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
            >
              {t[id]}
              {id === 'validation' && issueCount > 0 && (
                <span className="tab-badge">{issueCount}</span>
              )}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.collapse}
          title={t.collapse}
        >
          &raquo;
        </button>
      </div>
      <div className="sidebar-body" role="tabpanel">
        {tab === 'inspector' && <Inspector />}
        {tab === 'path' && <DesignPathPanel />}
        {tab === 'validation' && <ValidationPanel />}
      </div>
    </aside>
  );
}
