import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo, type CSSProperties } from 'react';
import { strings } from '../lib/strings';
import { findCustomKind, isCustomKind, kindLabel } from '../model/kinds';
import type { GameNode, Mda } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { KIND_HUE } from './kindHue';
import { useNodeDisplay } from './displayContext';
import { KindIcon } from './KindIcon';
import './GameNodeView.css';

export type GameFlowNode = Node<{ node: GameNode }, 'game'>;

function MdaIcon({ mda }: { mda: Mda }) {
  const label = strings.mda[mda];
  return (
    <svg
      className="gnode-mda"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {mda === 'mechanics' && <rect x="2.5" y="2.5" width="9" height="9" rx="1.5" />}
      {mda === 'dynamics' && <path d="M1.5 7c1.5-5 3.5-5 5.5 0s4 5 5.5 0" />}
      {mda === 'aesthetics' && <circle cx="7" cy="7" r="4.5" />}
    </svg>
  );
}

export const GameNodeView = memo(function GameNodeView({
  data,
  selected,
}: NodeProps<GameFlowNode>) {
  const node = data.node;
  const customKinds = useProjectStore((s) => s.project.customKinds);
  const insideCount = useProjectStore((s) =>
    node.childGraphId ? s.project.graphs[node.childGraphId]?.nodes.length : undefined,
  );
  const { dimmed, deferred } = useNodeDisplay(node.id);
  const custom = isCustomKind(node.kind) ? findCustomKind(node.kind, customKinds) : undefined;

  const style: CSSProperties = {};
  if (isCustomKind(node.kind)) {
    const custom = findCustomKind(node.kind, customKinds);
    if (custom) (style as Record<string, string>)['--kind-accent'] = custom.color;
  } else {
    (style as Record<string, number>)['--kind-hue'] = KIND_HUE[node.kind];
  }

  const layerLabel = node.layer === undefined ? null : strings.layers[node.layer];

  return (
    <div
      className="gnode"
      data-selected={selected}
      data-status={node.status}
      data-dim={dimmed}
      data-deferred={deferred}
      style={style}
    >
      <Handle type="target" position={Position.Left} />
      <div className="gnode-top">
        <span className="gnode-kind">
          {custom && <KindIcon icon={custom.icon} color={custom.color} size={12} />}
          {kindLabel(node.kind, customKinds)}
        </span>
        <span className="gnode-marks">
          {layerLabel && (
            <span className="gnode-layer" title={layerLabel}>
              L{node.layer}
            </span>
          )}
          <MdaIcon mda={node.mda} />
        </span>
      </div>
      <div className="gnode-title">{node.title || ' '}</div>
      <div className="gnode-bottom">
        <span className="gnode-status">{strings.status[node.status]}</span>
        {deferred && <span className="gnode-deferred">{strings.designPath.deferred}</span>}
        {insideCount !== undefined && (
          <span className="gnode-inside" title={strings.breadcrumb.openInside}>
            {strings.breadcrumb.inside(insideCount)}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
});
