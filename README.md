# Ludograph

A web-based diagram editor for game design. You draw mechanics, dynamics, aesthetics, resources, states and loops as typed nodes and edges, and the tool checks the graph and suggests what to work on next.

It's early. Right now it's a project scaffold and a data model, there is no canvas yet.

## Background

Two ideas shape the data model:

- MDA (Hunicke, LeBlanc, Zubek): mechanics, dynamics, aesthetics. You write the mechanics, players experience the aesthetics. Ludograph tries to make the chain from one to the other easy to draw and to check.
- The Onion Model by Paolo Tajè: https://paolos.blog/the-onion-model/

Not from either source, added by Ludograph: the rule that an inner layer should still work without the outer ones (shown as a warning, can be switched off), the Design Path panel, core-only prototype mode, and the validation rules.

## Running it

```sh
npm install
npm run dev
```

Also: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Plan

Canvas and typed nodes, then typed edges and custom kinds, drill-down, Graph/Onion/MDA views with a Design Path panel, validation, import/export and polish. After that a text GDD module, which will be based on [OpenGDD](https://github.com/berkecuhadar/opengdd), and maybe resource-flow simulation.

## License

MIT
