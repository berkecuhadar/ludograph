import type { GameNode, Layer, Point } from '../model/types';

export const NODE_W = 220;
export const NODE_H = 96;

// Node cards are 220x96, so their corners are 240 from the center. Keeping every
// pair of circles and every pair of neighbours at least that far apart means
// cards in the ring layout can never overlap.
const RING_STEP = 260;
const MIN_GAP = 245;
const MIN_CORE_RADIUS = 170;
const MIN_THICKNESS = 130;

const TRAY_MARGIN = 60;
const TRAY_COL = 260;
const TRAY_ROW = 120;
const TRAY_ROWS = 10;

export type Ring = { layer: Layer; inner: number; outer: number };
export type OnionGeometry = {
  /** Index is the layer: core, secondary, progression, narrative. */
  rings: Ring[];
  outerRadius: number;
  /** Nodes whose center is left of this line sit in the tray. */
  trayEdge: number;
  /** The tray box, for drawing. */
  tray: { x0: number; x1: number; y0: number; y1: number };
};
export type OnionLayout = {
  geometry: OnionGeometry;
  /** Top-left position per node id. */
  positions: Record<string, Point>;
};

const LAYERS: Layer[] = [0, 1, 2, 3];

function packRing(count: number, inner: number): { centers: Point[]; outer: number } {
  const centers: Point[] = [];
  let rho: number;
  let lastRho = inner;
  if (inner === 0) {
    if (count > 0) centers.push({ x: 0, y: 0 });
    rho = RING_STEP;
    lastRho = 0;
  } else {
    rho = inner + RING_STEP / 2;
  }

  while (centers.length < count) {
    const fit = Math.floor(Math.PI / Math.asin(Math.min(1, MIN_GAP / (2 * rho))));
    const n = Math.min(Math.max(1, fit), count - centers.length);
    // Turn each circle a little so the nodes don't line up in spokes.
    const turn = (rho / RING_STEP) * 0.7;
    for (let i = 0; i < n; i++) {
      const angle = turn + (2 * Math.PI * i) / n;
      centers.push({ x: rho * Math.cos(angle), y: rho * Math.sin(angle) });
    }
    lastRho = rho;
    rho += RING_STEP;
  }

  const needed = centers.length === 0 ? 0 : lastRho + RING_STEP / 2;
  const outer =
    inner === 0 ? Math.max(MIN_CORE_RADIUS, needed) : Math.max(inner + MIN_THICKNESS, needed);
  return { centers, outer };
}

const topLeft = (c: Point): Point => ({ x: c.x - NODE_W / 2, y: c.y - NODE_H / 2 });
const centerOf = (p: Point): Point => ({ x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 });

// Rings grow with the number of nodes in them. Nodes you dragged yourself keep
// their spot as long as it is still inside the right ring, otherwise they go
// back to a computed slot.
export function layoutOnion(
  nodes: GameNode[],
  overrides: Record<string, Point> = {},
  // Nodes being dragged right now keep their position even outside their ring.
  live: ReadonlySet<string> = new Set(),
): OnionLayout {
  const byLayer = new Map<Layer, GameNode[]>(LAYERS.map((l) => [l, []]));
  const loose: GameNode[] = [];
  for (const node of nodes) {
    if (node.layer === undefined) loose.push(node);
    else byLayer.get(node.layer)?.push(node);
  }

  const positions: Record<string, Point> = {};
  const rings: Ring[] = [];
  let inner = 0;

  for (const layer of LAYERS) {
    const members = byLayer.get(layer) ?? [];
    const { centers, outer } = packRing(members.length, inner);
    members.forEach((node, i) => {
      const slot = centers[i] ?? { x: 0, y: 0 };
      const own = overrides[node.id];
      const r = own ? Math.hypot(centerOf(own).x, centerOf(own).y) : -1;
      const keep = own !== undefined && (live.has(node.id) || (r >= inner && r < outer));
      positions[node.id] = keep && own ? own : topLeft(slot);
    });
    rings.push({ layer, inner, outer });
    inner = outer;
  }

  const outerRadius = inner;
  const trayEdge = -(outerRadius + 40);
  loose.forEach((node, i) => {
    const col = Math.floor(i / TRAY_ROWS);
    const row = i % TRAY_ROWS;
    const slot = {
      x: -(outerRadius + TRAY_MARGIN + NODE_W / 2 + col * TRAY_COL),
      y: -outerRadius + TRAY_ROW / 2 + row * TRAY_ROW,
    };
    const own = overrides[node.id];
    const keep = own !== undefined && (live.has(node.id) || centerOf(own).x < trayEdge);
    positions[node.id] = keep && own ? own : topLeft(slot);
  });

  const trayCols = Math.max(1, Math.ceil(loose.length / TRAY_ROWS));
  const trayRows = Math.max(3, Math.min(loose.length, TRAY_ROWS));
  const tray = {
    x0: trayEdge - trayCols * TRAY_COL - 20,
    x1: trayEdge,
    y0: -outerRadius,
    y1: -outerRadius + trayRows * TRAY_ROW,
  };

  return { geometry: { rings, outerRadius, trayEdge, tray }, positions };
}

// Which layer a dropped node belongs to. Null means the tray (no layer).
export function classifyOnion(topLeftPosition: Point, geometry: OnionGeometry): Layer | null {
  const c = centerOf(topLeftPosition);
  if (c.x < geometry.trayEdge) return null;
  const r = Math.hypot(c.x, c.y);
  const ring = geometry.rings.find((g) => r >= g.inner && r < g.outer);
  return ring ? ring.layer : 3;
}
