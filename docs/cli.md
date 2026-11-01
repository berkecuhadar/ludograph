# Command line tool

`ludograph` reads and writes the same `*.ludograph.json` file as the editor, so a script or an AI
assistant such as Claude Code can add nodes and edges to a project that lives in another repository.
It uses the editor's own code: the file reader, the edge rules and the validation rules. A
command that would break a rule is refused and the file is not touched.

## Install

```
npm run build:cli      # writes dist-cli/ludograph.mjs
npm link               # optional, makes `ludograph` available everywhere
```

Without `npm link`, call it as `node path/to/ludograph/dist-cli/ludograph.mjs`.

Every command prints JSON. Errors go to stderr and the exit code is 1. Commands that write accept
`--dry-run` to show the result without saving. Files are written through a temporary file, so an
interrupted run does not leave a half-written project.

A **NODE** argument is an id or an exact title. If a title matches several nodes, use the id.

## Commands

| Command                                       | What it does                                            |
| --------------------------------------------- | ------------------------------------------------------- |
| `init <file> [--name N]`                      | create an empty project                                 |
| `info <file>`                                 | graphs and counts                                       |
| `schema [<file>]`                             | node kinds, edge rules, allowed values                  |
| `nodes <file> [--graph G] [--all] [--kind K]` | list nodes and edges (`--no-edges` for nodes only)      |
| `add-node <file> --kind K --title T ...`      | add one node                                            |
| `update-node <file> NODE ...`                 | change fields of a node                                 |
| `remove-node <file> NODE`                     | remove a node, its edges and the graph inside it        |
| `add-edge <file> --kind K --from A --to B`    | add an edge, checked against the edge rules             |
| `remove-edge <file> --from A --to B`          | remove edges between two nodes                          |
| `apply <file> <batch.json or ->`              | add or update many nodes and edges in one go            |
| `scan-unity <file> <Assets dir>`              | make nodes from C# code, see below                      |
| `validate <file>`                             | run the design rules, exit code 1 when there are errors |

Node options: `--id`, `--description`, `--layer 0-3|none`, `--mda`, `--status`, `--tag` (repeatable),
`--param key=value` (repeatable), `--graph` (id or name), `--parent NODE` (put it inside that
node), `--aesthetic-type`, `--resource-role`, `--content-cost`, `--prototype-scope`,
`--return-hook`. Use `ludograph schema` for the allowed values.

## Batches

`apply` takes one JSON document. Nodes with an id that already exists are updated, the others are
created. Edges may refer to nodes by id or title, including nodes created in the same batch. The
whole batch is checked first; if anything is wrong nothing is saved and every problem is listed.

```json
{
  "nodes": [
    { "id": "u_Player", "kind": "mechanic", "title": "Player", "layer": 0 },
    { "kind": "aesthetic", "title": "Tension", "description": "..." },
    { "kind": "subMechanic", "title": "Dodge", "parent": "Player" }
  ],
  "edges": [{ "kind": "leadsTo", "from": "u_Player", "to": "Tension", "label": "optional" }]
}
```

A field set to `null` is cleared (for example `"layer": null`). `params` can be a list of
`{key, value}` or a plain object. New nodes without a position are placed on a grid below the
existing ones; use the editor's Auto layout to tidy up.

## Scanning a Unity project

```
ludograph scan-unity game.ludograph.json Assets [--refs] [--include-plain] [--exclude Folder,Other]
                                         [--skip-name 'UI$,Panel$']
```

| Found in C#                                                      | Becomes                                            |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| class deriving from `MonoBehaviour`                              | `mechanic` node                                    |
| class deriving from `ScriptableObject`                           | `entity` node                                      |
| enum named like `*State`, `*Phase`, `*Mode`, `*Status`, `*Stage` | `state` node                                       |
| `[RequireComponent(typeof(X))]`                                  | `requires` edge to X                               |
| any other class                                                  | skipped, unless `--include-plain`                  |
| a class mentioning another scanned class                         | `modifies` edge labelled `ref`, only with `--refs` |

- Folders called Editor, Tests, Test, Plugins, ThirdParty, Packages and TextMesh Pro are skipped.
- `--skip-name` takes comma separated regular expressions. A class whose name matches one gets no
  node, for example `UI$` for every name ending in UI. Edges to skipped classes are dropped too.
- The `/// <summary>` above a class becomes the node description.
- Node ids are `u_<ClassName>`, so scanning again updates instead of duplicating.
- A second scan never overwrites what you wrote. For existing nodes only the `source` and `base`
  parameters are refreshed. Classes that disappeared from the code are listed under
  `missingFromCode` and left in the graph.
- New nodes get the status `implemented`, the tags `unity` and the name of the folder the file
  is in, and a `source` parameter with the file path.
- The scanner reads text with patterns, not a full C# parser. Nested generics and unusual
  formatting can be missed. Review the result, then add the design meaning (layers, aesthetics,
  `leadsTo` edges) by hand or with an assistant.

## The same scan in the editor

**File > Import from Unity code...** does what `scan-unity` does, with a screen instead of flags.
Pick the Assets folder (or the whole project folder). The C# files are read in your browser and
never uploaded. You can then:

- switch on plain classes and reference edges,
- skip classes by name pattern and skip folders by name,
- tick or untick single nodes in the list (new nodes only),
- see the count of new nodes and edges before anything changes.

Press **Add** and the nodes go into the main graph as one step that **Undo** takes back. Nodes from
an earlier import keep what you wrote, exactly as with the command line tool. If the main graph was
empty, the graph is arranged afterwards (a checkbox, so you can turn it off).

## Using it from Claude Code

Copy [`examples/claude/SKILL.md`](../examples/claude/SKILL.md) to
`.claude/skills/ludograph/SKILL.md` in the Unity project and fix the path to the tool. Claude then
knows the commands, the rules, and the order to work in: scan, read `nodes`, describe, validate.
