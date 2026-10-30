import type { Gdd } from '../model/types';
import { CORE_BLOCKS, GROUPS, HEADER_FIELD_IDS, splitPillars, type FieldDef } from './sections';

const EMPTY = '_Not written yet._';
const text = (gdd: Gdd, id: string) => (gdd.values[id] ?? '').trim();

// The form part of the document, in the shape OpenGDD writes it: title, identity
// line, pillars, then the one-pager fields and every section that is switched on.
// `fallbackTitle` is used when the title field is empty.
export function gddMarkdown(gdd: Gdd, fallbackTitle: string): string {
  const out: string[] = [`# ${text(gdd, 'title') || fallbackTitle}`, ''];

  const mantra = text(gdd, 'mantra');
  if (mantra) out.push(`> ${mantra}`, '');

  const pillars = splitPillars(text(gdd, 'pillars'));
  if (pillars.length > 0) out.push(`**Design pillars:** ${pillars.join(' / ')}`, '');

  const field = (f: FieldDef) => text(gdd, f.id) || EMPTY;

  for (const block of CORE_BLOCKS) {
    for (const f of block.fields.filter((x) => !HEADER_FIELD_IDS.includes(x.id))) {
      out.push(`## ${f.label}`, '', field(f), '');
    }
  }

  for (const group of GROUPS) {
    if (!gdd.enabled[group.id]) continue;
    out.push(`## ${group.title}`, '');
    const [only] = group.fields;
    if (group.fields.length === 1 && only) {
      out.push(field(only), '');
    } else {
      for (const f of group.fields) out.push(`### ${f.label}`, '', field(f), '');
    }
  }

  for (const section of gdd.custom) {
    out.push(
      `## ${section.title.trim() || 'Untitled section'}`,
      '',
      section.body.trim() || EMPTY,
      '',
    );
  }

  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}
