import { strings } from '../lib/strings';
import { useUiStore } from '../store/uiStore';
import { Inspector } from './inspector/Inspector';
import './Sidebar.css';

export function Sidebar() {
  const open = useUiStore((s) => s.sidebarOpen);
  const setOpen = useUiStore((s) => s.setSidebarOpen);
  const t = strings.sidebar;

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
    <aside className="sidebar" aria-label={t.inspector}>
      <div className="sidebar-head">
        <strong>{t.inspector}</strong>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={t.collapse}
          title={t.collapse}
        >
          &raquo;
        </button>
      </div>
      <div className="sidebar-body">
        <Inspector />
      </div>
    </aside>
  );
}
