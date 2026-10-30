import type { GameNode, PlacedView, Point } from '../model/types';
import { layoutMda, type MdaGeometry } from './mdaLayout';
import { layoutOnion, type OnionGeometry } from './onionLayout';

export type ViewName = 'graph' | 'onion' | 'mda';

export type ViewLayout = {
  /** Where each node sits. Null in the Graph view, where nodes use their own position. */
  positions: Record<string, Point> | null;
  onion: OnionGeometry | null;
  mda: MdaGeometry | null;
};

export function computeLayout(
  view: ViewName,
  nodes: GameNode[],
  viewPositions: Partial<Record<PlacedView, Record<string, Point>>> | undefined,
  live: ReadonlySet<string>,
): ViewLayout {
  if (view === 'onion') {
    const { positions, geometry } = layoutOnion(nodes, viewPositions?.onion, live);
    return { positions, onion: geometry, mda: null };
  }
  if (view === 'mda') {
    const { positions, geometry } = layoutMda(nodes, viewPositions?.mda, live);
    return { positions, onion: null, mda: geometry };
  }
  return { positions: null, onion: null, mda: null };
}
