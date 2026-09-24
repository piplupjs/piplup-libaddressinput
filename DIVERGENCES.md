# Divergences from upstream libaddressinput

This package is a faithful port of Google's [libaddressinput](https://github.com/google/libaddressinput)
(C++ reference implementation). Every intentional behavioral or API
divergence is listed here. Each source file that contains a divergence also
documents it inline, closer to the code — this file is the index.

Divergences fall into two categories:

- **[Design divergences](#design-divergences)** — deliberate choices made for
  a headless, zero-dependency, Promise-based JS/TS library. These are
  permanent; there is no plan to "fix" them to match upstream.
- **[Data divergences](#data-divergences)** — the bundled fallback data is a
  snapshot of Google's live address metadata service (not the older OSS test
  fixture). Because it's a point-in-time snapshot, not live-updated, your local
  builds will use data from the snapshot's fetch date. See [Data source](#data-source)
  and [Refreshing the snapshot](#refreshing-the-snapshot). The snapshot is
  cross-checked against upstream's ported C++ via `test/golden/` — 24/24 corpus
  entries produced by this library's `formatAddress()` match the reference
  implementation byte-for-byte when fed the same snapshot data. See `test/golden/README.md`.

## Design divergences

| Area                                   | Upstream                                                                                                                                                                                         | This port                                                                                                              | Why                                                                                                                                                                                                                | Where                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Callbacks                              | `BuildCallback`/`Callback<Key,Data>`                                                                                                                                                             | `Promise`/`async function`                                                                                             | Idiomatic JS; no callback-registration boilerplate                                                                                                                                                                 | throughout                                                                           |
| `AddressNormalizer::Normalize`         | Mutates its `AddressData*` argument                                                                                                                                                              | `normalize()` returns a new `AddressData`                                                                              | Matches this library's general immutable-input convention                                                                                                                                                          | [`normalizer.ts`](packages/core/src/normalizer.ts)                                   |
| `RegionData` tree nodes                | Carry a `parent()` back-reference                                                                                                                                                                | No parent reference                                                                                                    | The algorithm never needs it, and a back-reference breaks JSON-serializability                                                                                                                                     | [`region-data.ts`](packages/core/src/region-data.ts)                                 |
| `RegionDataBuilder`'s cache            | Internal per-(region, language) memoization                                                                                                                                                      | None                                                                                                                   | Pure performance optimization; a consumer can memoize `buildRegionTree()` itself                                                                                                                                   | [`region-data.ts`](packages/core/src/region-data.ts)                                 |
| `AddressUiComponent` list              | Flat list; newline is itself a literal item when `include_literals`                                                                                                                              | `rows: LayoutRowItem[][]`, newlines become row boundaries                                                              | A better shape for a headless caller laying out a form                                                                                                                                                             | [`layout.ts`](packages/core/src/layout.ts)                                           |
| `AddressUiComponent`                   | No required-field flag                                                                                                                                                                           | `LayoutField.required`                                                                                                 | Saves callers a second `isFieldRequired()` call                                                                                                                                                                    | [`layout.ts`](packages/core/src/layout.ts)                                           |
| `buildLayout()`                        | N/A (upstream has no headless layout concept)                                                                                                                                                    | No `options` (region choices) field                                                                                    | Building those needs an async `Supplier`; `buildLayout` stays synchronous like the formatter. Combine `buildLayout()` + `buildRegionTree()` yourself, or use `createAddressForm()`, which already does             | [`layout.ts`](packages/core/src/layout.ts)                                           |
| `Localization::GetErrorMessage`        | Returns a resolved `std::string`                                                                                                                                                                 | `getProblemMessage()` returns `{id, params}`                                                                           | Headless: a consumer's own translation table keyed by the same ids is a drop-in alternative to `messages/en.ts`                                                                                                    | [`messages.ts`](packages/core/src/messages.ts)                                       |
| `ValidatingStorage`/`ValidatingUtil`   | Wraps stored data with an MD5 checksum + timestamp                                                                                                                                               | Timestamp (30-day TTL) only, no checksum                                                                               | A pluggable, often non-file-backed `Storage` doesn't get corrupted the way flat files can; avoids needing a hash implementation in an otherwise zero-dependency library                                            | [`internal/validating-storage.ts`](packages/core/src/internal/validating-storage.ts) |
| `PreloadSupplier::LoadRules`           | A second call while a load is already pending silently drops that caller's callback                                                                                                              | Concurrent `loadRules()` calls for the same region share/await the same in-flight promise                              | A Promise-based API needs every call to settle                                                                                                                                                                     | [`supplier/preload.ts`](packages/core/src/supplier/preload.ts)                       |
| `PreloadSupplier`                      | No serialization                                                                                                                                                                                 | `export()` / `static from()`                                                                                           | Enables a server-loads-then-client-hydrates hand-off with no duplicate network fetch                                                                                                                               | [`supplier/preload.ts`](packages/core/src/supplier/preload.ts)                       |
| `StringCompare::NaturalEquals`         | RE2 case-insensitive literal match                                                                                                                                                               | `toLocaleUpperCase()` comparison                                                                                       | Unicode-aware, but not guaranteed byte-identical to RE2 in every locale's edge cases                                                                                                                               | [`internal/string-compare.ts`](packages/core/src/internal/string-compare.ts)         |
| `Rule::GetPostalCodeMatcher`           | RE2 pattern                                                                                                                                                                                      | Native `RegExp`, no `u` flag                                                                                           | RE2 patterns in this dataset aren't written against JS's stricter Unicode-mode grammar                                                                                                                             | [`internal/rule.ts`](packages/core/src/internal/rule.ts)                             |
| `post_box_matchers.cc`'s `(?i)` prefix | RE2 inline case-insensitive flag                                                                                                                                                                 | JS `i` flag                                                                                                            | JS `RegExp` has no inline `(?i)` syntax                                                                                                                                                                            | [`internal/post-box-matchers.ts`](packages/core/src/internal/post-box-matchers.ts)   |
| `Rule` JSON keys                       | (an earlier draft of this project's own plan incorrectly claimed `Rule` also parses `upper`, `lang`, `key`, `sub_names`, `sub_lnames`, `sub_isoids`, `sub_zips`, `sub_mores`, `width_overrides`) | Not parsed — matches what `Rule::ParseJsonRule` in `rule.cc` actually reads                                            | Verified directly against the vendored submodule; sub-region display names come from each sub-key's own rule, not arrays on the parent                                                                             | [`internal/rule.ts`](packages/core/src/internal/rule.ts)                             |
| Form state (`createAddressForm`)       | No upstream equivalent (Java's `AddressWidget`, the closest analog, isn't in this vendored submodule snapshot)                                                                                   | New design, no rendering, `subscribe`/`getState` is the only guaranteed contract                                       | See `.planning/PLAN.md` §5/§6 Phase 7                                                                                                                                                                              | [`form/controller.ts`](packages/core/src/form/controller.ts)                         |
| React/Vue/etc. bindings                | N/A                                                                                                                                                                                              | Not part of this library at all                                                                                        | Headless-by-design; see `examples/`                                                                                                                                                                                | `.planning/PLAN.md` §7a                                                              |
| `FetchSource` default URL              | `https://chromium-i18n.appspot.com/ssl-aggregate-address/`                                                                                                                                       | `https://www.gstatic.com/chrome/autofill/libaddressinput/chromium-i18n/ssl-aggregate-address/` with fallback to legacy | In modern Google infrastructure the App Engine URL 302-redirects to GStatic CDN; querying GStatic directly eliminates the 302 round-trip and avoids CORS redirect failures and adblockers blocking `*.appspot.com` | [`source.ts`](packages/core/src/source.ts)                                           |

## Data divergences

### Data source

Upstream's `RegionDataConstants` (used for e.g. `GetRegionData`,
`GetMaxLookupKeyDepth`) wraps a table compiled from `region_data_constants.cc`,
which is generated at Google's internal build time from CLDR data and **is
not checked into the OSS repository**. This library's fallback data
(`packages/core/src/data/fallback.ts`, regenerated by
`scripts/gen-fallback.ts`) is instead parsed from a snapshot of Google's
live aggregate address metadata service, committed as `data/live-snapshot.json`.
The snapshot covers all 251 regions and 12,610+ data entries. It uses the
exact same `data/<CC>[/<sub>]=<json>` schema.

**Test isolation:** Tests that verify the _algorithm_ (e.g., validation rules,
region tree building) are isolated from the snapshot via `FixtureDataSource`, which
serves the older OSS test fixture (`testdata/countryinfo.txt`). This ensures
algorithm tests don't break if the snapshot is stale or updated. Data _presence_
tests (e.g., regression tests in `data.test.ts`) intentionally use the snapshot
to catch stale snapshots.

#### Refreshing the snapshot

To update the snapshot with fresh data:

```bash
node --experimental-strip-types scripts/fetch-live-data.ts  # Download from live service
node --experimental-strip-types scripts/gen-fallback.ts     # Regenerate fallback.ts
git add data/live-snapshot.json packages/core/src/data/fallback.ts
git commit -m "chore(data): update live address snapshot"
```

The `fetch-live-data.ts` script:

- Fetches metadata for all 251 regions in parallel (max 4 concurrent requests)
- Includes retries with exponential backoff for transient failures
- Commits the snapshot to `data/live-snapshot.json` with metadata (source URL, fetch timestamp)

### Known instances

Since the bundled snapshot is fresher than the old OSS fixture, many historical
divergences may no longer apply. To detect divergences between the current
snapshot and production data, compare the snapshot's timestamp (`data/live-snapshot.json`
metadata) against when you last tested against live endpoints. If the snapshot
is stale (e.g., more than a month old), consider refreshing it — see [Refreshing
the snapshot](#refreshing-the-snapshot).

For now, algorithm tests use `FixtureDataSource` (the old OSS fixture) to ensure
test stability across snapshot updates. If you spot a data discrepancy in real
use, that's worth reporting as an issue.

### What this means for you

- The bundled snapshot is point-in-time and won't auto-update. If you need
  the latest data from the live service, either refresh the snapshot periodically
  (see [Refreshing the snapshot](#refreshing-the-snapshot)) or use
  `PreloadSupplier`/`OndemandSupplier` with a live `Source` endpoint.
- The snapshot is _real_ data that covers all regions; it's good for most
  development and testing. Data regression tests (`data.test.ts`) validate that
  expected regions, subdivisions, and depth thresholds are present.
- Algorithm tests are isolated from snapshot freshness via `FixtureDataSource`,
  so you can update the snapshot without breaking test expectations.
- If you need to use your own snapshot (e.g., from an internal build), point
  `scripts/gen-fallback.ts` at your snapshot file to regenerate `data/fallback.ts`
  in the same aggregate JSON format.
