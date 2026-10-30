import type { Param } from '../../model/types';

// Parameter values are typed by what you write: numbers and true/false are
// recognised, everything else stays text.
export function parseParamValue(text: string): Param['value'] {
  const t = text.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  return text;
}
