export const CUSTOM_ICONS = ['square', 'circle', 'diamond', 'triangle', 'hexagon', 'star'] as const;
export type CustomIcon = (typeof CUSTOM_ICONS)[number];

export function isCustomIcon(name: string): name is CustomIcon {
  return (CUSTOM_ICONS as readonly string[]).includes(name);
}
