import { allNodes } from '../designPath/steps';
import type { GameNode, Project } from '../model/types';
import { splitPillars } from './sections';

// Text for document fields, built from the graph. Nothing here changes the graph
// or the document: the Document view asks for the text and the user decides.

function firstSentence(text: string): string {
  const flat = text.trim().replace(/\s+/g, ' ');
  const match = /^.*?[.!?](\s|$)/.exec(flat);
  return (match ? match[0] : flat).trim();
}

function bullet(node: GameNode, suffix = ''): string {
  const title = node.title.trim();
  const note = firstSentence(node.description);
  return `• ${title}${suffix}${note ? `: ${note}` : ''}`;
}

const list = (nodes: GameNode[], suffix?: (n: GameNode) => string) =>
  nodes.map((n) => bullet(n, suffix?.(n))).join('\n');

const named = (nodes: GameNode[]) => nodes.filter((n) => n.title.trim() !== '');

function pillars(project: Project): string {
  const titles = named(allNodes(project).filter((n) => n.kind === 'pillar')).map((n) =>
    n.title.trim().replace(/[.\s]+$/, ''),
  );
  return titles.length > 0 ? `${titles.join('. ')}.` : '';
}

// "Round cycle: Free speech → Voting → ...", following triggers (or feeds) edges from the core loop.
function coreLoop(project: Project): string {
  const graphs = [project.graphs[project.rootGraphId], ...Object.values(project.graphs)];
  for (const graph of graphs) {
    const loop = graph?.nodes.find((n) => n.kind === 'coreLoop');
    if (!graph || !loop) continue;

    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const seen = new Set([loop.id]);
    const steps: string[] = [];
    let current = loop.id;
    for (let i = 0; i < 20; i++) {
      const edge = graph.edges.find(
        (e) =>
          e.source === current &&
          (e.kind === 'triggers' || e.kind === 'feeds') &&
          !seen.has(e.target),
      );
      const next = edge && byId.get(edge.target);
      if (!edge || !next) break;
      seen.add(next.id);
      steps.push(next.title.trim() || next.kind);
      current = next.id;
    }
    const name = loop.title.trim();
    if (steps.length > 0) return `${name}: ${steps.join(' → ')}`;
    return loop.description.trim() || name;
  }
  return '';
}

export type GraphSource = {
  /** What the button says it pulls, for the tooltip. */
  hint: string;
  build: (project: Project) => string;
};

// Field id -> where its text can come from.
export const GRAPH_SOURCES: Record<string, GraphSource> = {
  pillars: { hint: 'Your pillar nodes', build: pillars },
  coreLoop: { hint: 'The core loop node and what it triggers', build: coreLoop },
  audience: {
    hint: 'Your persona nodes',
    build: (p) => list(named(allNodes(p).filter((n) => n.kind === 'persona'))),
  },
  lore: {
    hint: 'Your narrative nodes (layer 3)',
    build: (p) => list(named(allNodes(p).filter((n) => n.layer === 3))),
  },
  progression: {
    hint: 'Your progression and item nodes (layer 2)',
    build: (p) => list(named(allNodes(p).filter((n) => n.layer === 2))),
  },
  rules: {
    hint: 'Your rule nodes',
    build: (p) => list(named(allNodes(p).filter((n) => n.kind === 'rule'))),
  },
  interaction: {
    hint: 'Your layer 0 mechanic and action nodes',
    build: (p) =>
      list(
        named(
          allNodes(p).filter(
            (n) => n.layer === 0 && (n.kind === 'mechanic' || n.kind === 'action'),
          ),
        ),
      ),
  },
  economy: {
    hint: 'Your resource nodes',
    build: (p) =>
      list(named(allNodes(p).filter((n) => n.kind === 'resource')), (n) =>
        n.resourceRole ? ` (${n.resourceRole})` : '',
      ),
  },
};

// Titles from the pillars line that have no pillar node yet.
export function pillarsToCreate(project: Project, pillarsText: string): string[] {
  const have = new Set(
    allNodes(project)
      .filter((n) => n.kind === 'pillar')
      .map((n) =>
        n.title
          .trim()
          .replace(/[.\s]+$/, '')
          .toLowerCase(),
      ),
  );
  const seen = new Set<string>();
  return splitPillars(pillarsText).filter((title) => {
    const key = title.toLowerCase();
    if (have.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
