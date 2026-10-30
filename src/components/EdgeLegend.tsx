import { strings } from '../lib/strings';
import { EDGE_KINDS } from '../model/types';
import { EdgeKindIcon } from './EdgeKindIcon';
import './EdgeLegend.css';

export function EdgeLegend() {
  return (
    <details className="legend">
      <summary>{strings.legend.title}</summary>
      <ul>
        {EDGE_KINDS.map((kind) => (
          <li key={kind} title={strings.edgeKinds[kind].hint}>
            <EdgeKindIcon kind={kind} />
            {strings.edgeKinds[kind].label}
          </li>
        ))}
      </ul>
    </details>
  );
}
