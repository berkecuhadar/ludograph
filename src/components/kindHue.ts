import type { BuiltinKind } from '../model/types';

// Hue (0-360) per built-in kind. Lightness is set in CSS so the same hue works in light and dark.
export const KIND_HUE: Record<BuiltinKind, number> = {
  pillar: 265,
  aesthetic: 330,
  persona: 295,
  dynamic: 20,
  coreLoop: 150,
  mechanic: 135,
  subMechanic: 170,
  action: 105,
  resource: 45,
  item: 75,
  entity: 190,
  state: 215,
  event: 5,
  rule: 240,
  progression: 205,
  narrative: 350,
  note: 60,
};
