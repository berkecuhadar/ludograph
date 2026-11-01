import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { findNode, type Batch } from '../src/cli/batch.ts';
import {
  applyAndReport,
  infoOf,
  initProject,
  listNodes,
  readProject,
  removeEdges,
  removeNode,
  schemaOf,
  specFromFlags,
  validateProject,
  type Flags,
  type Outcome,
} from '../src/cli/commands.ts';
import {
  IGNORED_FOLDERS,
  isSkippedPath,
  scanUnity,
  type SourceFile,
} from '../src/cli/unityScan.ts';
import type { Project } from '../src/model/types.ts';

const BOOLEAN_FLAGS = new Set(['dry-run', 'refs', 'include-plain', 'all', 'no-edges', 'help']);

const HELP = `ludograph <command> <file.ludograph.json> [options]

Commands
  init <file> [--name N]              create an empty project
  info <file>                         graphs and counts
  schema [<file>]                     node kinds, edge rules and allowed values
  nodes <file> [--graph G] [--all] [--kind K] [--layer L] [--no-edges]
  add-node <file> --kind K --title T [--id I] [--description D] [--layer 0-3|none]
           [--mda M] [--status S] [--tag T]... [--param k=v]... [--graph G] [--parent NODE]
  update-node <file> <node> [same options as add-node, except --kind]
  remove-node <file> <node>
  add-edge <file> --kind K --from NODE --to NODE [--label L]
  remove-edge <file> --from NODE --to NODE [--kind K]
  apply <file> <batch.json|->         add or update many nodes and edges at once
  scan-unity <file> <Assets dir> [--refs] [--include-plain] [--exclude a,b] [--skip-name re,re]
  validate <file>                     run the design rules, exit 1 on errors

A NODE is an id or an exact, unique title. Add --dry-run to any command that writes
to see the result without saving. Output is JSON. Errors go to stderr with exit code 1.
`;

function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const eq = arg.indexOf('=');
    const key = arg.slice(2, eq === -1 ? undefined : eq);
    if (BOOLEAN_FLAGS.has(key)) {
      flags[key] = true;
      continue;
    }
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1);
    if (value === undefined) throw new Error(`--${key} needs a value.`);
    const old = flags[key];
    flags[key] = old === undefined ? value : [...(Array.isArray(old) ? old : [String(old)]), value];
  }
  return { positional, flags };
}

const print = (value: unknown) => process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);

function die(errors: string[]): never {
  for (const e of errors) process.stderr.write(`error: ${e}\n`);
  process.exit(1);
}

function load(file: string | undefined): { path: string; project: Project } {
  if (!file) die(['Missing project file.']);
  const path = resolve(file);
  if (!existsSync(path)) die([`File not found: ${path}`]);
  const read = readProject(readFileSync(path, 'utf8'));
  if ('errors' in read) die(read.errors);
  return { path, project: read.project };
}

// Writes next to the file first and then renames, so a crash never leaves half a project.
function save(path: string, project: Project) {
  const temp = `${path}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(temp, `${JSON.stringify(project, null, 2)}\n`);
  renameSync(temp, path);
}

function finish(outcome: Outcome, path: string, flags: Flags) {
  if (!outcome.ok) die(outcome.errors);
  if (outcome.project && flags['dry-run'] !== true) save(path, outcome.project);
  print(
    flags['dry-run'] === true ? { dryRun: true, ...(outcome.output as object) } : outcome.output,
  );
}

function readBatch(source: string | undefined): Batch {
  if (!source) die(['apply needs a batch file, or - to read from stdin.']);
  const text = readFileSync(source === '-' ? 0 : resolve(source), 'utf8');
  try {
    return JSON.parse(text) as Batch;
  } catch (error) {
    return die([
      `The batch is not valid JSON (${error instanceof Error ? error.message : error}).`,
    ]);
  }
}

function collectCSharp(dir: string, root: string, extra: string[]): SourceFile[] {
  const out: SourceFile[] = [];
  const walk = (current: string) => {
    for (const entry of readdirSync(current)) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        if (!IGNORED_FOLDERS.includes(entry)) walk(full);
        continue;
      }
      if (!entry.endsWith('.cs')) continue;
      const path = relative(root, full).split('\\').join('/');
      if (isSkippedPath(path, extra)) continue;
      const inside = relative(dir, full).split('\\').join('/').split('/');
      out.push({
        path,
        text: readFileSync(full, 'utf8'),
        ...(inside.length > 1 ? { folder: inside[inside.length - 2] } : {}),
      });
    }
  };
  walk(dir);
  return out;
}

function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const [command, file, extra] = positional;
  if (!command || flags.help === true || command === 'help') {
    process.stdout.write(HELP);
    return;
  }

  switch (command) {
    case 'init': {
      if (!file) die(['init needs a file name.']);
      const path = resolve(file);
      if (existsSync(path)) die([`${path} already exists.`]);
      const name =
        typeof flags.name === 'string' ? flags.name : basename(file).split('.')[0] || 'Untitled';
      return finish(initProject(name), path, flags);
    }
    case 'schema': {
      return print(schemaOf(file ? load(file).project : undefined));
    }
    case 'info': {
      return print(infoOf(load(file).project));
    }
    case 'nodes': {
      const outcome = listNodes(load(file).project, flags);
      if (!outcome.ok) die(outcome.errors);
      return print(outcome.output);
    }
    case 'validate': {
      const { output, hasErrors } = validateProject(load(file).project);
      print(output);
      if (hasErrors) process.exit(1);
      return;
    }
    case 'add-node': {
      const { path, project } = load(file);
      const spec = specFromFlags(flags);
      if (typeof spec === 'string') die([spec]);
      return finish(applyAndReport(project, { nodes: [spec] }), path, flags);
    }
    case 'update-node': {
      const { path, project } = load(file);
      if (!extra) die(['update-node needs a node id or title.']);
      const spec = specFromFlags(flags);
      if (typeof spec === 'string') die([spec]);
      if (spec.kind) die(['A node kind can not be changed. Remove the node and add it again.']);
      const node = findNode(project, extra);
      if (typeof node === 'string') die([node]);
      spec.id = node.id;
      return finish(applyAndReport(project, { nodes: [spec] }), path, flags);
    }
    case 'remove-node': {
      const { path, project } = load(file);
      if (!extra) die(['remove-node needs a node id or title.']);
      return finish(removeNode(project, extra), path, flags);
    }
    case 'add-edge': {
      const { path, project } = load(file);
      const kind = flags.kind;
      const from = flags.from;
      const to = flags.to;
      if (typeof kind !== 'string' || typeof from !== 'string' || typeof to !== 'string') {
        die(['add-edge needs --kind, --from and --to.']);
      }
      const label = typeof flags.label === 'string' ? flags.label : undefined;
      const edge = { kind, from, to, ...(label ? { label } : {}) } as NonNullable<
        Batch['edges']
      >[number];
      return finish(applyAndReport(project, { edges: [edge] }), path, flags);
    }
    case 'remove-edge': {
      const { path, project } = load(file);
      return finish(removeEdges(project, flags), path, flags);
    }
    case 'apply': {
      const { path, project } = load(file);
      return finish(applyAndReport(project, readBatch(extra)), path, flags);
    }
    case 'scan-unity': {
      const { path, project } = load(file);
      if (!extra) die(['scan-unity needs the folder to scan, usually Assets.']);
      const dir = resolve(extra);
      if (!existsSync(dir)) die([`Folder not found: ${dir}`]);
      const exclude = typeof flags.exclude === 'string' ? flags.exclude.split(',') : [];
      const files = collectCSharp(dir, process.cwd(), exclude);
      const scan = scanUnity(files, project, {
        includePlain: flags['include-plain'] === true,
        refs: flags.refs === true,
        skipNames: typeof flags['skip-name'] === 'string' ? flags['skip-name'].split(',') : [],
      });
      const outcome = applyAndReport(project, scan.batch);
      if (!outcome.ok) die(outcome.errors);
      const report = {
        filesRead: files.length,
        ...scan.counts,
        ...(outcome.output as object),
        missingFromCode: scan.missing,
        warnings: scan.warnings,
      };
      return finish({ ...outcome, output: report }, path, flags);
    }
    default:
      die([`Unknown command "${command}". Run ludograph help.`]);
  }
}

try {
  main();
} catch (error) {
  die([error instanceof Error ? error.message : String(error)]);
}
