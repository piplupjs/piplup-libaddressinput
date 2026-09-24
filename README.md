# @piplup/libaddressinput

A headless, dependency-free TypeScript port of Google's
[libaddressinput](https://github.com/google/libaddressinput): international
postal address formatting, validation, normalization, and form-layout data,
with no rendering and no framework dependency.

**Status: Phases 0–7 of 8 complete.** Formatting, validation, normalization,
region data, form layout, and a headless form controller are implemented and
tested against upstream's own ported test cases. See
[.planning/PLAN.md](.planning/PLAN.md) for the full plan and progress, and
[DIVERGENCES.md](DIVERGENCES.md) for every place this port intentionally
differs from upstream.

## Why headless

This library returns plain, serializable data and functions — never DOM
nodes, components, or CSS. Bring your own UI (React, Vue, Svelte, a CLI, a
server template, or none at all). See runnable examples in [`examples/`](examples).

## Quick start

```ts
import {
  PreloadSupplier,
  FetchSource,
  MemoryStorage,
  formatAddress,
  normalize,
  validate,
  buildLayout,
} from "@piplup/libaddressinput";
import { en } from "@piplup/libaddressinput/messages/en";

const supplier = new PreloadSupplier(new FetchSource(), new MemoryStorage());
await supplier.loadRules("US");

const address = {
  regionCode: "US",
  addressLine: ["1600 Amphitheatre Pkwy"],
  locality: "Mountain View",
  administrativeArea: "California",
  postalCode: "94043",
  recipient: "Jane Doe",
};

formatAddress(normalize(supplier, address));
// ["Jane Doe", "1600 Amphitheatre Pkwy", "Mountain View, CA 94043"]

const problems = await validate(supplier, address);
// [] or e.g. [{ field: "POSTAL_CODE", problem: "MISMATCHING_VALUE" }]

const layout = buildLayout("US", "en");
// { rows: [[{ field: "RECIPIENT", labelId: "RECIPIENT_LABEL", ... }], ...] }
// render however you like — labelId resolves to text via en[labelId]
```

For a form that manages its own state (loading, layout, region tree,
validation) without any rendering, see `createAddressForm()` and
[`examples/react-form-controller`](examples/react-form-controller).

## Offline data

The library bundles a snapshot of Google's address metadata service, covering
all 251 regions with 12,610+ data entries. This snapshot is committed to the
repository and serves as fallback data when a `Supplier` can't reach the live
service. The snapshot was fetched on **2026-09-24**.

**To use live data instead**, pass a `FetchSource` to `PreloadSupplier` or
`OndemandSupplier` — the library will fetch per-region as needed.

**To refresh the bundled snapshot** (e.g., monthly or before a release):

```bash
node --experimental-strip-types scripts/fetch-live-data.ts
node --experimental-strip-types scripts/gen-fallback.ts
git add data/live-snapshot.json packages/core/src/data/fallback.ts
git commit -m "chore(data): refresh address metadata snapshot"
```

The fetch script fetches all 251 regions in parallel (4 concurrent requests),
retries on failure with exponential backoff, and commits the snapshot with
metadata (source URL, fetch timestamp). See [DIVERGENCES.md](DIVERGENCES.md)
for more on data sources and snapshot freshness.

## Packages

- [`packages/core`](packages/core) — `@piplup/libaddressinput`, the library.
- [`examples/`](examples) — small, unpublished apps showing how to consume
  the library. Not part of the published package.
  - [`node-cli`](examples/node-cli) — format/validate/normalize from the
    command line, no UI at all.
  - [`vanilla-dom`](examples/vanilla-dom) — `buildLayout()` mapped to
    hand-written DOM elements, no framework.
  - [`react-basic`](examples/react-basic) — plain `useState`, calling
    `buildLayout()`/`validate()` directly.
  - [`react-form-controller`](examples/react-form-controller) — a small
    `useAddressForm` hook (copy-paste code, not part of the library) wiring
    `createAddressForm()` to React via `useSyncExternalStore`.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

To try an example:

```bash
pnpm --filter node-cli-example start -- --region US --admin-area CA \
  --locality "Mountain View" --postal-code 94043
pnpm --filter vanilla-dom-example dev
pnpm --filter react-basic-example dev
pnpm --filter react-form-controller-example dev
```

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE). This project ports
code from Google's libaddressinput (Apache-2.0); see
[DIVERGENCES.md](DIVERGENCES.md) for how this port differs from it.
