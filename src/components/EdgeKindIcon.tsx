import type { EdgeKind } from '../model/types';
import { edgeColor, edgeLineStyle } from './edgeStyle';

export function EdgeKindIcon({ kind }: { kind: EdgeKind }) {
  const color = edgeColor(kind);
  return (
    <svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true" className="edge-icon">
      <line x1="1" y1="6" x2="25" y2="6" style={edgeLineStyle(kind, color)} />
      <path d="M24 1.5 L32 6 L24 10.5 Z" fill={color} />
    </svg>
  );
}
