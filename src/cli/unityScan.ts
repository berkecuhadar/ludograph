import type { Param, Project } from '../model/types';
import type { Batch, EdgeSpec, NodeSpec } from './batch';

export type SourceFile = {
  /** Shown in the node's source parameter. */
  path: string;
  text: string;
  /** The folder the file is in, used as a tag. */
  folder?: string;
};

export type ScanOptions = {
  /** Also make nodes for plain C# classes, not only MonoBehaviours and ScriptableObjects. */
  includePlain?: boolean;
  /** Add a "modifies" edge for every class that holds a reference to another scanned class. */
  refs?: boolean;
  /** Regular expressions. A class or enum whose name matches one of them gets no node. */
  skipNames?: string[];
};

type Found = {
  name: string;
  type: 'class' | 'enum';
  bases: string[];
  path: string;
  folder?: string;
  summary: string;
  requires: string[];
  body: string;
};

export type ScanResult = {
  batch: Batch;
  /** Nodes from an earlier scan whose class is no longer in the code. They are left alone. */
  missing: { id: string; title: string }[];
  warnings: string[];
  counts: { classes: number; enums: number };
};

export const SCAN_ID_PREFIX = 'u_';
const MONO_BASES = ['MonoBehaviour', 'NetworkBehaviour', 'StateMachineBehaviour'];
const SO_BASES = ['ScriptableObject'];
const STATE_ENUM = /(state|phase|mode|status|stage)s?$/i;
// Folders that never hold game code worth putting in a design graph.
export const IGNORED_FOLDERS = [
  'Editor',
  'Tests',
  'Test',
  'Plugins',
  'ThirdParty',
  'Packages',
  'TextMesh Pro',
  'node_modules',
  'Library',
  'Temp',
  'obj',
  'Logs',
  'Builds',
  '.git',
];

// Replaces comments and string contents with spaces. Offsets and line breaks stay the
// same, so positions found in the blanked text also point into the original.
function blank(text: string): string {
  const spaces = (s: string) => s.replace(/[^\n]/g, ' ');
  return text.replace(
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|@"(?:[^"]|"")*"|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])'/g,
    spaces,
  );
}

function matchingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return text.length;
}

function summaryOf(original: string): string {
  const lines = original
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('///'))
    .map((l) => l.replace(/^\/\/\/\s?/, ''));
  const joined = lines.join(' ');
  const match = /<summary>([\s\S]*?)<\/summary>/.exec(joined);
  return (match?.[1] ?? '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const DECLARATION =
  /\b(class|enum)\s+([A-Za-z_]\w*)(?:\s*<[^>{]*>)?\s*(?::\s*([^{;]+?))?\s*(?:where\s[^{]+)?\{/g;

export function parseCSharp(file: SourceFile): Found[] {
  const blanked = blank(file.text);
  const found: Found[] = [];
  for (const m of blanked.matchAll(DECLARATION)) {
    const [whole, keyword, name, baseList] = m;
    if (!name || !keyword) continue;
    const start = m.index;
    const open = start + whole.length - 1;
    const close = matchingBrace(blanked, open);
    const headerStart =
      Math.max(
        blanked.lastIndexOf(';', start),
        blanked.lastIndexOf('{', start),
        blanked.lastIndexOf('}', start),
      ) + 1;
    const header = blanked.slice(headerStart, start);
    const requires = [...header.matchAll(/RequireComponent\s*\(([^\]]*)\]/g)].flatMap((r) =>
      [...(r[1] ?? '').matchAll(/typeof\s*\(\s*([A-Za-z_][\w.]*)\s*\)/g)].map(
        (t) => (t[1] ?? '').split('.').pop() ?? '',
      ),
    );
    found.push({
      name,
      type: keyword === 'enum' ? 'enum' : 'class',
      bases: (baseList ?? '')
        .split(',')
        .map((b) => b.trim().replace(/<.*$/, '').split('.').pop() ?? '')
        .filter(Boolean),
      path: file.path,
      folder: file.folder,
      summary: summaryOf(file.text.slice(headerStart, start)),
      requires,
      body: blanked.slice(open + 1, close),
    });
  }
  return found;
}

export function isSkippedPath(path: string, extra: string[] = []): boolean {
  const parts = path.split('/');
  return parts.some((p) => IGNORED_FOLDERS.includes(p) || extra.includes(p));
}

// Walks up the base list to see if a class is, in the end, a MonoBehaviour or ScriptableObject.
function derivesFrom(
  found: Found,
  roots: string[],
  byName: Map<string, Found>,
  seen = new Set<string>(),
): boolean {
  if (seen.has(found.name)) return false;
  seen.add(found.name);
  return found.bases.some((b) => {
    if (roots.includes(b)) return true;
    const parent = byName.get(b);
    return parent !== undefined && derivesFrom(parent, roots, byName, seen);
  });
}

export function scanUnity(files: SourceFile[], project: Project, options: ScanOptions): ScanResult {
  const warnings: string[] = [];
  const all = files.flatMap(parseCSharp);
  const byName = new Map<string, Found>();
  for (const f of all) {
    if (byName.has(f.name)) {
      warnings.push(
        `Two types are called ${f.name} (${byName.get(f.name)?.path} and ${f.path}). Only the first is used.`,
      );
    } else byName.set(f.name, f);
  }

  const existing = new Map(
    Object.values(project.graphs)
      .flatMap((g) => g.nodes)
      .map((n) => [n.id, n]),
  );

  const skip = (options.skipNames ?? []).map((pattern) => {
    try {
      return new RegExp(pattern);
    } catch {
      throw new Error(`--skip-name: "${pattern}" is not a valid regular expression.`);
    }
  });

  const kept = [...byName.values()].filter((f) => {
    if (skip.some((re) => re.test(f.name))) return false;
    if (f.type === 'enum') return STATE_ENUM.test(f.name);
    if (derivesFrom(f, MONO_BASES, byName) || derivesFrom(f, SO_BASES, byName)) return true;
    return options.includePlain === true;
  });
  const names = new Set(kept.map((f) => f.name));
  const idOf = (name: string) => `${SCAN_ID_PREFIX}${name}`;

  const nodes: NodeSpec[] = kept.map((f) => {
    const kind =
      f.type === 'enum' ? 'state' : derivesFrom(f, SO_BASES, byName) ? 'entity' : 'mechanic';
    const params: Param[] = [{ key: 'source', value: f.path }];
    const base = f.bases[0];
    if (base) params.push({ key: 'base', value: base });

    const old = existing.get(idOf(f.name));
    if (old) {
      // Keep everything the designer wrote. Only the pointers into the code are refreshed.
      const mine = old.params.filter((p) => p.key !== 'source' && p.key !== 'base');
      return { id: old.id, params: [...mine, ...params] };
    }
    return {
      id: idOf(f.name),
      kind,
      title: f.name,
      description: f.summary,
      status: 'implemented',
      tags: ['unity', ...(f.folder ? [f.folder] : [])],
      params,
    };
  });

  const edges: EdgeSpec[] = [];
  const seenEdge = new Set<string>();
  const addEdge = (kind: EdgeSpec['kind'], from: string, to: string, label?: string) => {
    const key = `${kind}:${from}:${to}`;
    if (from === to || seenEdge.has(key)) return;
    seenEdge.add(key);
    edges.push({ kind, from: idOf(from), to: idOf(to), ...(label ? { label } : {}) });
  };

  for (const f of kept) {
    for (const needed of f.requires) if (names.has(needed)) addEdge('requires', f.name, needed);
    if (!options.refs) continue;
    for (const other of names) {
      if (other === f.name || f.requires.includes(other)) continue;
      if (new RegExp(`\\b${other}\\b`).test(f.body)) addEdge('modifies', f.name, other, 'ref');
    }
  }

  const scannedIds = new Set(kept.map((f) => idOf(f.name)));
  const missing = [...existing.values()]
    .filter((n) => n.id.startsWith(SCAN_ID_PREFIX) && !scannedIds.has(n.id))
    .map((n) => ({ id: n.id, title: n.title }));

  return {
    batch: { nodes, edges },
    missing,
    warnings,
    counts: {
      classes: kept.filter((f) => f.type === 'class').length,
      enums: kept.filter((f) => f.type === 'enum').length,
    },
  };
}

// Narrows a scan to the new nodes the user ticked. Nodes that already exist stay, so their
// source pointers are refreshed. An edge stays only if both ends will exist afterwards.
export function pickNodes(batch: Batch, project: Project, chosen: ReadonlySet<string>): Batch {
  const existing = new Set(Object.values(project.graphs).flatMap((g) => g.nodes.map((n) => n.id)));
  const known = new Set([...existing, ...chosen]);
  return {
    ...batch,
    nodes: (batch.nodes ?? []).filter((n) => n.id !== undefined && known.has(n.id)),
    edges: (batch.edges ?? []).filter((e) => known.has(e.from) && known.has(e.to)),
  };
}
