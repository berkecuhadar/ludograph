import { useMemo, useState } from 'react';
import { goToNode } from '../lib/navigate';
import { strings } from '../lib/strings';
import { graphPath } from '../model/graphOps';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useValidationStore } from '../store/validationStore';
import type { Issue, Severity } from '../validation';
import './ValidationPanel.css';

const SEVERITIES: Severity[] = ['error', 'warning', 'info'];
const MARK: Record<Severity, string> = { error: 'E', warning: 'W', info: 'i' };

export function ValidationPanel() {
  const t = strings.validation;
  const issues = useValidationStore((s) => s.issues);
  const project = useProjectStore((s) => s.project);
  const setActiveGraph = useProjectStore((s) => s.setActiveGraph);
  const onionHeuristic = useSettingsStore((s) => s.onionHeuristic);
  const [hidden, setHidden] = useState<Severity[]>([]);

  const counts = useMemo(() => {
    const result: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
    for (const i of issues) result[i.severity]++;
    return result;
  }, [issues]);

  const visible = issues.filter((i) => !hidden.includes(i.severity));
  const multipleGraphs = Object.keys(project.graphs).length > 1;

  const open = (issue: Issue) => {
    const [first] = issue.nodeIds;
    if (first) goToNode(issue.graphId, first);
    else setActiveGraph(issue.graphId);
  };

  const where = (issue: Issue) => {
    if (!multipleGraphs) return null;
    const path = graphPath(project, issue.graphId)
      .map((c) => c.label)
      .join(' / ');
    return t.inGraph(path);
  };

  return (
    <div className="validation">
      <div className="validation-filters" role="group" aria-label={t.title}>
        {SEVERITIES.map((s) => (
          <button
            key={s}
            type="button"
            data-severity={s}
            aria-pressed={!hidden.includes(s)}
            onClick={() =>
              setHidden(hidden.includes(s) ? hidden.filter((h) => h !== s) : [...hidden, s])
            }
          >
            {t.severity[s]} {counts[s]}
          </button>
        ))}
      </div>
      {!onionHeuristic && <p className="muted hint">{t.onionOff}</p>}

      {issues.length === 0 ? (
        <p className="muted">{t.none}</p>
      ) : (
        <ul className="issues">
          {visible.map((issue) => (
            <li key={issue.id} data-severity={issue.severity}>
              <button type="button" onClick={() => open(issue)}>
                <span className="issue-mark" aria-label={t.severity[issue.severity]}>
                  {MARK[issue.severity]}
                </span>
                <span className="issue-text">
                  <span>{issue.message}</span>
                  <span className="muted issue-meta">
                    {t.rules[issue.rule]}
                    {issue.nodeIds.length === 0 && ` - ${t.graphLevel}`}
                    {where(issue) && ` - ${where(issue)}`}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
