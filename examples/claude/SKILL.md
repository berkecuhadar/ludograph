---
name: ludograph
description: Add, update and check nodes and edges in this project's Ludograph game design graph (design/game.ludograph.json). Use when the user talks about the game design graph, mechanics, MDA, onion layers, or asks to sync the graph with the code.
---

# Ludograph graph

The design graph lives in `design/game.ludograph.json`. Never edit that file by hand. Use the
command line tool, which refuses invalid nodes and edges:

```
node PATH/TO/ludograph/dist-cli/ludograph.mjs <command> design/game.ludograph.json ...
```

Replace the path, or run `npm link` once in the ludograph repo and use `ludograph`. Below, `F` means
the project file.

## Order of work

1. `schema` shows the node kinds, edge rules and allowed values. Run it first if unsure.
2. `nodes F --no-edges` lists what exists. Reuse a node instead of adding a duplicate.
3. To sync with code: `scan-unity F Assets --dry-run` first, then without `--dry-run`. Use
   `--skip-name` to leave out UI classes and similar. Safe to repeat; it never overwrites text the
   designer wrote. Read `missingFromCode` in the output and tell the user, do not delete.
4. Describe things the code cannot say, in one `apply` batch (JSON on stdin with `-`).
5. `validate F` at the end. Fix errors. Report warnings to the user.

## Rules of the model

- Axes: mechanics (what you build), dynamics (what emerges), aesthetics (what the player feels).
- Onion layers: 0 core, 1 secondary, 2 progression, 3 narrative. A node must not `requires` a node
  in a more outer layer. The core must work alone.
- Edges: `feeds`, `requires`, `unlocks`, `triggers`, `modifies` only join mechanics to mechanics.
  `leadsTo` goes mechanic or dynamic to dynamic or aesthetic. `serves` goes to a pillar or aesthetic.
- Nodes made by the scanner have ids starting with `u_`. Give hand-made nodes no id, or a stable
  readable one.
- Describe aesthetics with a sentence about the feeling, not one word.
- Do not invent design intent. If the code does not show why something exists, ask the user.

## Examples

```
ludograph add-node F --kind aesthetic --title "Tension" --description "Every hit feels risky."
ludograph add-edge F --kind leadsTo --from u_PlayerController --to Tension
ludograph update-node F u_Health --layer 1 --return-hook "Players come back to upgrade it."
echo '{"nodes":[{"kind":"subMechanic","title":"Dodge","parent":"u_PlayerController"}]}' | ludograph apply F -
```
