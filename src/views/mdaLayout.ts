import { MDA_AXES, type GameNode, type Mda, type Point } from '../model/types';
import { NODE_H, NODE_W } from './onionLayout';

const COL_W = 260;
const ROW_H = 120;
const PAD = 40;
const ROWS_MAX = 8;
const MIN_LANE_W = 320;
const MIN_ROWS = 3;

export type Lane = { mda: Mda; x0: number; x1: number };
export type MdaGeometry = { lanes: Lane[]; top: number; bottom: number };
export type MdaLayout = { geometry: MdaGeometry; positions: Record<string, Point> };

const centerOf = (p: Point): Point => ({ x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 });

// Three lanes from left to right. A lane gets wider as it fills up, in columns of up to eight nodes.
export function layoutMda(
  nodes: GameNode[],
  overrides: Record<string, Point> = {},
  // Nodes being dragged right now keep their position even outside their lane.
  live: ReadonlySet<string> = new Set(),
): MdaLayout {
  const groups = new Map<Mda, GameNode[]>(MDA_AXES.map((m) => [m, []]));
  for (const node of nodes) groups.get(node.mda)?.push(node);

  const tallest = Math.max(
    MIN_ROWS,
    ...[...groups.values()].map((g) => Math.min(g.length, ROWS_MAX)),
  );
  const bottom = PAD * 2 + tallest * ROW_H;

  const lanes: Lane[] = [];
  const positions: Record<string, Point> = {};
  let x = 0;

  for (const mda of MDA_AXES) {
    const members = groups.get(mda) ?? [];
    const cols = Math.max(1, Math.ceil(members.length / ROWS_MAX));
    const width = Math.max(MIN_LANE_W, cols * COL_W + PAD * 2);
    const lane: Lane = { mda, x0: x, x1: x + width };

    members.forEach((node, i) => {
      const col = Math.floor(i / ROWS_MAX);
      const row = i % ROWS_MAX;
      const slot = { x: lane.x0 + PAD + COL_W * (col + 0.5), y: PAD + ROW_H * (row + 0.5) };
      const own = overrides[node.id];
      const c = own ? centerOf(own) : undefined;
      const keep =
        c !== undefined &&
        (live.has(node.id) || (c.x >= lane.x0 && c.x < lane.x1 && c.y >= 0 && c.y <= bottom));
      positions[node.id] = keep && own ? own : { x: slot.x - NODE_W / 2, y: slot.y - NODE_H / 2 };
    });

    lanes.push(lane);
    x = lane.x1;
  }

  return { geometry: { lanes, top: 0, bottom }, positions };
}

export function classifyMda(topLeftPosition: Point, geometry: MdaGeometry): Mda {
  const { x } = centerOf(topLeftPosition);
  const lane = geometry.lanes.find((l) => x >= l.x0 && x < l.x1);
  if (lane) return lane.mda;
  return x < 0 ? 'mechanics' : 'aesthetics';
}
