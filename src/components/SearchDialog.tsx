import { useMemo, useState, type KeyboardEvent } from 'react';
import { goToNode } from '../lib/navigate';
import { strings } from '../lib/strings';
import { graphPath } from '../model/graphOps';
import { kindLabel } from '../model/kinds';
import type { GameNode } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Modal } from './Modal';
import './QuickAdd.css';

type Hit = { graphId: string; node: GameNode; where: string };

const MAX_HITS = 50;

function SearchBody() {
  const project = useProjectStore((s) => s.project);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const hits = useMemo<Hit[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const found: Hit[] = [];
    for (const graph of Object.values(project.graphs)) {
      const where = graphPath(project, graph.id)
        .map((c) => c.label)
        .join(' / ');
      for (const node of graph.nodes) {
        const haystack = [node.title, node.description, ...node.tags].join('\n').toLowerCase();
        if (haystack.includes(needle)) found.push({ graphId: graph.id, node, where });
        if (found.length >= MAX_HITS) return found;
      }
    }
    return found;
  }, [project, query]);

  const choose = (hit: Hit | undefined) => hit && goToNode(hit.graphId, hit.node.id);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, hits.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(hits[active]);
    }
  };

  return (
    <div className="modal-body quickadd">
      <h2>{strings.search.title}</h2>
      <input
        autoFocus
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="search-list"
        placeholder={strings.search.placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <ul id="search-list" role="listbox" className="quickadd-list">
        {hits.map((hit, i) => (
          <li
            key={hit.node.id}
            role="option"
            aria-selected={i === active}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(hit)}
          >
            <strong>{hit.node.title || kindLabel(hit.node.kind, project.customKinds)}</strong>{' '}
            <span className="muted">
              {kindLabel(hit.node.kind, project.customKinds)} - {hit.where}
            </span>
          </li>
        ))}
        {hits.length === 0 && (
          <li className="quickadd-empty">
            {query.trim() ? strings.search.empty : strings.search.hint}
          </li>
        )}
      </ul>
    </div>
  );
}

export function SearchDialog() {
  const open = useUiStore((s) => s.dialog === 'search');
  const setDialog = useUiStore((s) => s.setDialog);

  return (
    <Modal open={open} title={strings.search.title} onClose={() => setDialog(null)}>
      <SearchBody />
    </Modal>
  );
}
