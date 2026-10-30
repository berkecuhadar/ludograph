import { stepMatches, type StepId } from '../designPath/steps';
import { gddMarkdown } from '../gdd/markdown';
import { hasContent } from '../gdd/sections';
import { strings } from '../lib/strings';
import { kindGroup } from '../model/edgeRules';
import { kindLabel } from '../model/kinds';
import type { GameNode, Graph, Project } from '../model/types';
import { leadsToChain } from '../views/chains';

type SectionId = StepId | 'dynamics' | 'other';

const ORDER = {
  outsideIn: [
    'experience',
    'personas',
    'narrative',
    'progression',
    'secondary',
    'core',
    'dynamics',
    'other',
  ],
  coreFirst: [
    'core',
    'secondary',
    'progression',
    'narrative',
    'dynamics',
    'experience',
    'personas',
    'other',
  ],
} satisfies Record<Project['designOrder'], SectionId[]>;

// A node goes to the first of these that fits, whatever the working order is.
const MATCH_ORDER: StepId[] = [
  'experience',
  'personas',
  'narrative',
  'progression',
  'secondary',
  'core',
];

const LAYER_SECTIONS: SectionId[] = ['narrative', 'progression', 'secondary'];

function sectionOf(node: GameNode, project: Project): SectionId {
  const step = MATCH_ORDER.find((s) => stepMatches(s, node));
  if (step) return step;
  return kindGroup(node, project.customKinds) === 'dynamic' ? 'dynamics' : 'other';
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const heading = (level: number, text: string) => `${'#'.repeat(Math.min(6, level))} ${text}`;
const titleOf = (node: GameNode, project: Project) =>
  node.title.trim() || kindLabel(node.kind, project.customKinds);

function names(ids: string[], byId: Map<string, GameNode>, project: Project): string {
  return ids
    .map((id) => byId.get(id))
    .filter((n): n is GameNode => n !== undefined)
    .map((n) => titleOf(n, project))
    .join(', ');
}

function renderNode(
  node: GameNode,
  graph: Graph,
  project: Project,
  level: number,
  section: SectionId,
  out: string[],
) {
  const g = strings.gdd;
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const deferred = project.coreOnly === true && node.layer !== undefined && node.layer >= 1;

  out.push(heading(level, titleOf(node, project)), '');

  const meta = [kindLabel(node.kind, project.customKinds)];
  if (node.layer !== undefined) meta.push(`Layer ${node.layer}`);
  meta.push(strings.status[node.status]);
  if (deferred) meta.push(g.deferred);
  if (node.aestheticType)
    meta.push(`${g.aestheticType}: ${strings.aestheticTypes[node.aestheticType]}`);
  if (node.resourceRole)
    meta.push(`${g.resourceRole}: ${strings.resourceRoles[node.resourceRole]}`);
  if (node.kind === 'narrative' && node.contentCost) {
    meta.push(`${g.contentCost}: ${strings.contentCosts[node.contentCost]}`);
  }
  if (node.prototypeScope)
    meta.push(`${g.prototypeScope}: ${strings.prototypeScopes[node.prototypeScope]}`);
  out.push(`*${meta.join(' - ')}*`, '');

  if (node.description.trim()) out.push(node.description.trim(), '');
  if (node.layer === 1 && node.returnHook?.trim()) {
    out.push(`**${g.returnHook}:** ${node.returnHook.trim()}`, '');
  }

  if (node.kind === 'persona' && node.ocean) {
    const rows = (['o', 'c', 'e', 'a', 'n'] as const).filter((k) => node.ocean?.[k] !== undefined);
    if (rows.length > 0) {
      out.push(`| ${g.trait} | ${g.value} |`, '| --- | --- |');
      for (const k of rows) out.push(`| ${strings.oceanTraits[k]} | ${node.ocean[k]} |`);
      out.push('');
    }
  }

  if (node.params.length > 0) {
    out.push(`| ${g.parameter} | ${g.value} |`, '| --- | --- |');
    for (const p of node.params) out.push(`| ${cell(p.key)} | ${cell(String(p.value))} |`);
    out.push('');
  }

  if (section === 'experience' && node.kind === 'aesthetic') {
    const chain = leadsToChain(graph.edges, [node.id]);
    const mechanics = graph.nodes.filter(
      (n) =>
        n.id !== node.id &&
        chain.nodes.has(n.id) &&
        kindGroup(n, project.customKinds) === 'mechanic' &&
        graph.edges.some((e) => e.kind === 'leadsTo' && e.source === n.id),
    );
    out.push(
      mechanics.length > 0
        ? `**${g.reachedBy}:** ${mechanics.map((n) => titleOf(n, project)).join(', ')}`
        : `**${g.reachedBy}:** ${g.nothingReaches}`,
      '',
    );
  }

  const outgoing = (kind: 'requires' | 'feeds') =>
    graph.edges.filter((e) => e.kind === kind && e.source === node.id).map((e) => e.target);
  const conflicts = graph.edges
    .filter((e) => e.kind === 'conflicts' && (e.source === node.id || e.target === node.id))
    .map((e) => (e.source === node.id ? e.target : e.source));
  for (const [label, ids] of [
    [g.requires, outgoing('requires')],
    [g.feeds, outgoing('feeds')],
    [g.conflicts, conflicts],
  ] as const) {
    if (ids.length > 0) out.push(`**${label}:** ${names(ids, byId, project)}`, '');
  }
}

function renderGraph(
  project: Project,
  graph: Graph,
  level: number,
  out: string[],
  seen: Set<string>,
) {
  seen.add(graph.id);
  const groups = new Map<SectionId, GameNode[]>();
  for (const node of graph.nodes) {
    const section = sectionOf(node, project);
    groups.set(section, [...(groups.get(section) ?? []), node]);
  }

  for (const section of ORDER[project.designOrder]) {
    const members = groups.get(section);
    if (!members || members.length === 0) continue;
    const deferred = project.coreOnly === true && LAYER_SECTIONS.includes(section);
    const title = strings.gdd.sections[section] + (deferred ? ` - ${strings.gdd.deferred}` : '');
    out.push(heading(level, title), '');

    for (const node of members) {
      renderNode(node, graph, project, level + 1, section, out);
      const inner = node.childGraphId ? project.graphs[node.childGraphId] : undefined;
      if (inner && !seen.has(inner.id) && inner.nodes.length > 0) {
        out.push(heading(level + 2, strings.gdd.insideOf(titleOf(node, project))), '');
        renderGraph(project, inner, level + 3, out, seen);
      }
    }
  }
}

// A design document in the order the project says it should be worked in:
// experience and personas first when working outside-in, the core first otherwise.
// Drill-down graphs are nested under the node they are inside of.
export function exportMarkdown(project: Project): string {
  const hasModel = Object.values(project.graphs).some((g) => g.nodes.length > 0);
  const hasForm = hasContent(project.gdd);
  const out: string[] = [];

  // With a written document, that comes first and the graph follows as "Design model".
  if (project.gdd && hasForm) {
    out.push(gddMarkdown(project.gdd, project.name).trimEnd(), '');
    if (hasModel) out.push(heading(2, strings.gdd.designModel), '');
  } else {
    out.push(heading(1, project.name), '');
  }

  if (hasModel || !hasForm) {
    out.push(
      strings.gdd.workingOrder(strings.designPath.orders[project.designOrder].toLowerCase()),
      '',
    );
    if (project.coreOnly) out.push(`> ${strings.gdd.coreOnlyNote}`, '');
    const root = project.graphs[project.rootGraphId];
    if (root) renderGraph(project, root, hasForm ? 3 : 2, out, new Set());
  }

  return `${out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()}\n`;
}
