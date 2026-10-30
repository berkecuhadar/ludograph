# Data model

A Ludograph project is one JSON document, saved as `*.ludograph.json`. The types live in
[`src/model/types.ts`](../src/model/types.ts), and
[`src/model/schema.ts`](../src/model/schema.ts) reads files back with readable errors.

## Where the ideas come from

- **MDA** (Hunicke, LeBlanc, Zubek): every node sits on one of three axes, mechanics, dynamics or
  aesthetics. You write mechanics, players feel aesthetics.
- **The Onion Model** by Paolo Tajè: https://paolos.blog/the-onion-model/. Mechanics are arranged in
  four layers: core mechanic (0), secondary mechanic (1), progression (2) and narrative (3).

Not from either source, added by Ludograph: the rule that an inner layer should still work without
the outer ones, the Design Path panel, core-only prototype mode and the validation rules.

## Project

```ts
type Project = {
  schemaVersion: 1;
  id: string;
  name: string;
  rootGraphId: string;
  designOrder: 'outsideIn' | 'coreFirst';
  graphs: Record<string, Graph>; // one graph per drill-down level
  customKinds: CustomKind[];
  viewPositions?: { onion?: Record<nodeId, Point>; mda?: Record<nodeId, Point> };
  coreOnly?: boolean;
};
```

`viewPositions` holds where nodes were dragged in the Onion and MDA views. The Graph view keeps its
own layout in `node.position`, so switching views never destroys it. `coreOnly` is the core-only
prototype switch: layers 1 to 3 are drawn faded and marked as deferred, and the Markdown export
labels them too.

`designOrder` only changes the Design Path panel and the order of the Markdown export. It never
changes the data.

## Graph

```ts
type Graph = {
  id: string;
  name: string;
  parentNodeId?: string; // the node this graph is the inside of
  nodes: GameNode[];
  edges: GameEdge[];
};
```

Double-click a node (or press Enter) to go inside it. The inner graph is created the first time.
Deleting a node deletes the graphs inside it, after asking.

## Node

```ts
type GameNode = {
  id: string;
  kind: NodeKind;
  title: string;
  description: string; // markdown
  mda: 'mechanics' | 'dynamics' | 'aesthetics';
  layer?: 0 | 1 | 2 | 3; // onion layer, missing for nodes outside the onion
  status: 'idea' | 'designed' | 'prototyped' | 'implemented' | 'cut';
  tags: string[];
  params: { key: string; value: string | number | boolean }[];
  position: { x: number; y: number };
  childGraphId?: string;

  aestheticType?:
    | 'sensation'
    | 'fantasy'
    | 'narrative'
    | 'challenge'
    | 'fellowship'
    | 'discovery'
    | 'expression'
    | 'submission';
  resourceRole?: 'pool' | 'source' | 'sink' | 'converter';
  ocean?: { o?: number; c?: number; e?: number; a?: number; n?: number }; // 0..100, may be partial
  contentCost?: 'low' | 'medium' | 'high';
  prototypeScope?: 'full' | 'stub' | 'skip';
  returnHook?: string;
};
```

`ocean` is allowed to be partial so that "persona without OCEAN values" can be checked.

### Default axis and layer per kind

`mda` and `layer` start from the kind and can be changed per node.

| Kind        | MDA        | Layer | Meaning                                    |
| ----------- | ---------- | ----- | ------------------------------------------ |
| pillar      | aesthetics | none  | a design promise the whole game serves     |
| aesthetic   | aesthetics | none  | the felt experience                        |
| persona     | aesthetics | none  | a target player, described with OCEAN      |
| dynamic     | dynamics   | none  | emergent behavior                          |
| action      | mechanics  | 0     | a player verb                              |
| coreLoop    | mechanics  | 0     | the loop the core mechanic repeats         |
| mechanic    | mechanics  | 0     | a rule or interaction                      |
| state       | mechanics  | 0     | a game state or phase                      |
| subMechanic | mechanics  | 0     | a part of a mechanic                       |
| rule        | mechanics  | 0     | a constraint or invariant                  |
| entity      | mechanics  | 0     | actor or role                              |
| event       | mechanics  | 0     | something that happens and triggers things |
| resource    | mechanics  | 0     | something counted                          |
| item        | mechanics  | 2     | collectible or equippable thing            |
| progression | mechanics  | 2     | level, unlock track, score, reputation     |
| narrative   | mechanics  | 3     | story, theme, lore                         |
| note        | mechanics  | none  | free note or open question                 |

Nothing starts in layer 1. A secondary mechanic is a `mechanic` that you set to layer 1 on purpose;
the palette has a "Secondary mechanic" entry that does it for you.

### Custom kinds

```ts
type CustomKind = {
  id: string;
  name: string;
  color: string;
  icon: string;
  mda: Mda;
  layer?: Layer;
};
```

A node of a custom kind has `kind: "custom:<id>"`. For edge rules it counts as a mechanics,
dynamic or aesthetic node, depending on its axis.

## Edges

| Kind      | Reads as                           | From                                     | To                   |
| --------- | ---------------------------------- | ---------------------------------------- | -------------------- |
| feeds     | A supplies B                       | mechanics                                | mechanics            |
| requires  | A cannot work without B            | mechanics                                | mechanics            |
| unlocks   | A makes B available                | mechanics                                | mechanics            |
| triggers  | A causes B to start                | mechanics                                | mechanics            |
| modifies  | A changes how B behaves            | mechanics                                | mechanics            |
| conflicts | A and B work against each other    | mechanics, dynamics, aesthetics, pillars | same                 |
| leadsTo   | mechanic, dynamic, aesthetic chain | mechanics, dynamics                      | dynamics, aesthetics |
| serves    | A supports a pillar or aesthetic   | anything                                 | pillars, aesthetics  |

"Mechanics" here means every kind on the mechanics axis (action, state, rule, resource, narrative and
so on). The table lives in one place, [`src/model/edgeRules.ts`](../src/model/edgeRules.ts). Self
loops and exact duplicates are always refused, with a message that says why.

## Validation

Pure functions in [`src/validation/`](../src/validation), each with tests. They run on every graph,
a moment after you stop editing.

| Rule                         | Severity | What it checks                                                                                                  |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| Onion layer dependency       | warning  | a node `requires` a node in a more outer layer. Only nodes with a layer count. Can be switched off in settings. |
| Vague experience             | info     | an aesthetic described in under 30 characters                                                                   |
| Persona without OCEAN        | info     | any of the five values is missing                                                                               |
| Unestimated narrative        | warning  | a narrative node without a content cost                                                                         |
| Unscoped outer layer         | info     | a layer 2 or 3 node without a prototype scope                                                                   |
| No return hook               | info     | a layer 1 node with an empty return hook                                                                        |
| Empty core                   | warning  | the graph has mechanics but nothing in layer 0                                                                  |
| Heavy core                   | info     | more than N mechanic and action nodes in layer 0 (default 5, in settings)                                       |
| Orphan node                  | info     | a node without edges, notes excluded                                                                            |
| Requires cycle               | error    | nodes that require each other in a loop                                                                         |
| Dangling mechanic            | warning  | a mechanic or sub-mechanic with no `leadsTo` path to a dynamic or aesthetic                                     |
| Unsupported aesthetic        | warning  | an aesthetic or pillar that no mechanic reaches (`leadsTo` or `serves`)                                         |
| Core loop flow               | warning  | a core loop that nothing feeds or triggers, or that feeds or triggers nothing                                   |
| Resource flow                | warning  | a resource that is never produced or never consumed                                                             |
| Implemented needs unfinished | warning  | an implemented node that requires an idea or a cut node                                                         |
| Duplicate title              | info     | two nodes with the same title in one graph                                                                      |

The severities for the rules the original brief left open are a judgment call and easy to change.

## Exports

- **Markdown GDD.** Follows `designOrder`: experience and personas first when working outside-in,
  then the layers inwards; the core first otherwise. Each node has its description, a parameter table
  and requires / feeds / conflicts lists. Headings follow the drill-down hierarchy, narrative nodes
  show their content cost, and aesthetics list the mechanics that lead to them. In core-only mode,
  layers 1 to 3 are labelled deferred.
- **Unity JSON.** Flat lists of graphs, nodes and edges with the same ids as the project. Unity's
  `JsonUtility` has no null, so a missing layer is `-1` and missing text is `""`; parameter values are
  text with a `valueType`. Sample C# for loading it is in [`examples/unity/`](../examples/unity).
- **PNG and SVG.** A picture of the current view, fitted to its content.
