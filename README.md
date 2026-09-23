# @piplup/libaddressinput

A headless, dependency-free TypeScript port of Google's
[libaddressinput](https://github.com/google/libaddressinput): international
postal address formatting, validation, normalization, and form-layout data,
with no rendering and no framework dependency.

**Status: early scaffolding.** See [.planning/PLAN.md](.planning/PLAN.md) for
the full plan, phases, and progress.

## Why headless

This library returns plain, serializable data and functions — never DOM
nodes, components, or CSS. Bring your own UI (React, Vue, Svelte, a CLI, a
server template, or none at all). See `.planning/PLAN.md` §1 and §7a.

## Packages

- [`packages/core`](packages/core) — `@piplup/libaddressinput`, the library.
- `examples/` — small, unpublished apps (Node CLI, plain DOM, React) showing
  how to consume the library. Not part of the published package.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
