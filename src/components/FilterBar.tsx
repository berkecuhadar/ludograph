import { useMemo } from 'react';
import { allNodes } from '../designPath/steps';
import { strings } from '../lib/strings';
import { STATUSES, type Status } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { isFilterActive } from '../views/display';
import './Toolbar.css';

export function FilterBar() {
  const project = useProjectStore((s) => s.project);
  const filter = useUiStore((s) => s.filter);
  const setFilter = useUiStore((s) => s.setFilter);
  const t = strings.filter;

  const tags = useMemo(
    () => [...new Set(allNodes(project).flatMap((n) => n.tags))].sort((a, b) => a.localeCompare(b)),
    [project],
  );

  const toggle = (status: Status) =>
    setFilter({
      ...filter,
      statuses: filter.statuses.includes(status)
        ? filter.statuses.filter((s) => s !== status)
        : [...filter.statuses, status],
    });

  return (
    <details className="filter">
      <summary data-active={isFilterActive(filter)}>
        {isFilterActive(filter) ? t.active : t.title}
      </summary>
      <div className="filter-body">
        <div className="filter-group" role="group" aria-label={t.status}>
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={filter.statuses.includes(status)}
              onClick={() => toggle(status)}
            >
              {strings.status[status]}
            </button>
          ))}
        </div>
        <label className="filter-tag">
          <span>{t.tag}</span>
          <select
            value={filter.tag ?? ''}
            onChange={(e) => setFilter({ ...filter, tag: e.target.value || null })}
          >
            <option value="">{t.anyTag}</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!isFilterActive(filter)}
          onClick={() => setFilter({ statuses: [], tag: null })}
        >
          {t.clear}
        </button>
      </div>
    </details>
  );
}
