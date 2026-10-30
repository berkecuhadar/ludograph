import type { GameNode } from '../model/types';

// `source` requires `target`. That breaks Ludograph's runtime-dependency
// heuristic when the target sits in a more outer layer than the source.
// Only nodes that have a layer are compared.
export function crossesOnion(source: GameNode, target: GameNode): boolean {
  if (source.layer === undefined || target.layer === undefined) return false;
  return target.layer > source.layer;
}
