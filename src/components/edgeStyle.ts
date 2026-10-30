import { MarkerType, type EdgeMarker } from '@xyflow/react';
import type { CSSProperties } from 'react';
import type { EdgeKind } from '../model/types';

// Each edge kind gets its own hue and its own line pattern, so kinds can be told
// apart without relying on color alone.
const EDGE_STYLE: Record<EdgeKind, { hue: number; dash?: string; width: number }> = {
  feeds: { hue: 150, width: 2 },
  requires: { hue: 25, dash: '7 4', width: 2 },
  unlocks: { hue: 280, dash: '2 4', width: 2.5 },
  triggers: { hue: 210, width: 3 },
  modifies: { hue: 45, dash: '10 3 2 3', width: 2 },
  conflicts: { hue: 0, dash: '4 3', width: 2.5 },
  leadsTo: { hue: 185, width: 3.5 },
  serves: { hue: 325, dash: '1 5', width: 3 },
};

export const WARNING_COLOR = 'hsl(35 90% 48%)';

export function edgeColor(kind: EdgeKind): string {
  return `hsl(${EDGE_STYLE[kind].hue} 55% 48%)`;
}

export function edgeLineStyle(kind: EdgeKind, color = edgeColor(kind)): CSSProperties {
  const { dash, width } = EDGE_STYLE[kind];
  return {
    stroke: color,
    strokeWidth: width,
    strokeDasharray: dash,
    strokeLinecap: dash && dash.startsWith('1 ') ? 'round' : 'butt',
  };
}

export function edgeMarker(kind: EdgeKind, color = edgeColor(kind)): EdgeMarker {
  return { type: MarkerType.ArrowClosed, color, width: 16, height: 16 };
}
