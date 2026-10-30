import { useStore } from '@xyflow/react';
import { strings } from '../lib/strings';
import type { Layer } from '../model/types';
import type { ViewLayout } from '../views/computeLayout';
import './ViewUnderlay.css';

const RINGS: Layer[] = [3, 2, 1, 0];

// Draws the rings and lanes behind the canvas, following its pan and zoom.
export function ViewUnderlay({ layout }: { layout: ViewLayout }) {
  const [x, y, zoom] = useStore((s) => s.transform);
  const { onion, mda } = layout;
  if (!onion && !mda) return null;

  return (
    <svg className="underlay" aria-hidden="true">
      <g transform={`translate(${x} ${y}) scale(${zoom})`}>
        {onion && (
          <>
            {RINGS.map((layer) => {
              const ring = onion.rings[layer];
              if (!ring) return null;
              return (
                <circle
                  key={layer}
                  r={ring.outer}
                  style={{ fill: `var(--ring-${layer})` }}
                  className="ring"
                />
              );
            })}
            {onion.rings.map((ring) => (
              <text key={ring.layer} x={0} y={-ring.outer + 28} className="underlay-label">
                {strings.layers[ring.layer]}
              </text>
            ))}
            <rect
              x={onion.tray.x0}
              y={onion.tray.y0}
              width={onion.tray.x1 - onion.tray.x0}
              height={onion.tray.y1 - onion.tray.y0}
              className="tray"
            />
            <text x={onion.tray.x0 + 14} y={onion.tray.y0 + 24} className="underlay-label start">
              {strings.views.noLayer}
            </text>
          </>
        )}
        {mda &&
          mda.lanes.map((lane) => (
            <g key={lane.mda}>
              <rect
                x={lane.x0}
                y={mda.top - 70}
                width={lane.x1 - lane.x0}
                height={mda.bottom - mda.top + 100}
                style={{ fill: `var(--lane-${lane.mda})` }}
                className="lane"
              />
              <text x={(lane.x0 + lane.x1) / 2} y={mda.top - 30} className="underlay-label">
                {strings.mda[lane.mda]}
              </text>
            </g>
          ))}
      </g>
    </svg>
  );
}
