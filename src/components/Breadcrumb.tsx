import { useMemo } from 'react';
import { strings } from '../lib/strings';
import { graphPath } from '../model/graphOps';
import { useProjectStore } from '../store/projectStore';
import './Breadcrumb.css';

export function Breadcrumb() {
  const project = useProjectStore((s) => s.project);
  const activeGraphId = useProjectStore((s) => s.activeGraphId);
  const setActiveGraph = useProjectStore((s) => s.setActiveGraph);
  const path = useMemo(() => graphPath(project, activeGraphId), [project, activeGraphId]);

  return (
    <nav className="breadcrumb" aria-label={strings.breadcrumb.label}>
      <ol>
        {path.map((crumb, i) => {
          const last = i === path.length - 1;
          return (
            <li key={crumb.graphId}>
              {last ? (
                <span aria-current="page">{crumb.label}</span>
              ) : (
                <button type="button" onClick={() => setActiveGraph(crumb.graphId)}>
                  {crumb.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
