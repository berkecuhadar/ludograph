# Contributing

Thanks for helping. Ludograph is small and opinionated, so please open an issue before a large change.

## Setup

```sh
npm install
npm run dev
```

Before opening a pull request, these must pass:

```sh
npm run lint && npm run typecheck && npm test && npm run build && npm run build:cli
```

## Conventions

- Strict TypeScript. Dependency versions are pinned exactly; ask before adding a library.
- Short, lowercase commit messages that say what changed ("add node inspector").
- Model, validation, exporter and command line code needs unit tests.
- The command line tool (`cli/`) is a thin wrapper. Logic that the editor also uses lives in
  `src/cli/`, so both share the same code and tests.
- User-facing text goes in `src/lib/strings.ts`, never inline.
- No emoji in the UI. Every control must be reachable by keyboard.
