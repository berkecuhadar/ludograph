import { isCustomIcon } from '../model/customIcons';

type Props = { icon: string; color?: string; size?: number };

// Small shapes for custom kinds. Unknown names fall back to a square.
export function KindIcon({ icon, color = 'currentColor', size = 14 }: Props) {
  const name = isCustomIcon(icon) ? icon : 'square';
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className="kind-icon">
      {name === 'square' && <rect x="2" y="2" width="10" height="10" rx="1.5" fill={color} />}
      {name === 'circle' && <circle cx="7" cy="7" r="5.2" fill={color} />}
      {name === 'diamond' && <polygon points="7,1.2 12.8,7 7,12.8 1.2,7" fill={color} />}
      {name === 'triangle' && <polygon points="7,1.8 12.8,12 1.2,12" fill={color} />}
      {name === 'hexagon' && (
        <polygon points="7,1.2 12.2,4.1 12.2,9.9 7,12.8 1.8,9.9 1.8,4.1" fill={color} />
      )}
      {name === 'star' && (
        <polygon
          points="7,1.2 8.8,5.2 13,5.6 9.8,8.4 10.8,12.6 7,10.4 3.2,12.6 4.2,8.4 1,5.6 5.2,5.2"
          fill={color}
        />
      )}
    </svg>
  );
}
