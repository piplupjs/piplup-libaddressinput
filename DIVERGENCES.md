# Divergences from upstream libaddressinput

This package is a faithful port of Google's [libaddressinput](https://github.com/google/libaddressinput)
(C++ reference implementation). Every intentional behavioral or API
divergence is listed here. Each source file that contains a divergence also
documents it inline, closer to the code — this file is the index.

Divergences fall into two categories:

- **[Design divergences](#design-divergences)** — deliberate choices made for
  a headless, zero-dependency, Promise-based JS/TS library. These are
  permanent; there is no plan to "fix" them to match upstream.
- **[Data divergences](#data-divergences)** — differences that come from
  using `testdata/countryinfo.txt` (the real dataset shipped in upstream's
  OSS repo) as this library's fallback data, since upstream's actual
  production dataset (`region_data_constants.cc`) is generated at Google's
  internal build time and isn't in the OSS repo (see [Data source](#data-source)).
  These are *not* bugs in the port — the porting algorithm is verified
  correct against the data actually shipped — but they mean this library's
  output can differ from a Chromium build using upstream's live data server,
  for the specific fields called out below. "Verified correct" isn't just
  asserted: `test/golden/` cross-checks `formatAddress()` against a real,
  independently-compiled build of upstream's own C++ `GetFormattedNationalAddress`,
  fed the exact same `testdata/countryinfo.txt` data — 24/24 entries in the
  committed corpus match byte-for-byte. See `test/golden/README.md`.

## Design divergences

| Area | Upstream | This port | Why | Where |
|---|---|---|---|---|
| Callbacks | `BuildCallback`/`Callback<Key,Data>` | `Promise`/`async function` | Idiomatic JS; no callback-registration boilerplate | throughout |
| `AddressNormalizer::Normalize` | Mutates its `AddressData*` argument | `normalize()` returns a new `AddressData` | Matches this library's general immutable-input convention | [`normalizer.ts`](packages/core/src/normalizer.ts) |
| `RegionData` tree nodes | Carry a `parent()` back-reference | No parent reference | The algorithm never needs it, and a back-reference breaks JSON-serializability | [`region-data.ts`](packages/core/src/region-data.ts) |
| `RegionDataBuilder`'s cache | Internal per-(region, language) memoization | None | Pure performance optimization; a consumer can memoize `buildRegionTree()` itself | [`region-data.ts`](packages/core/src/region-data.ts) |
| `AddressUiComponent` list | Flat list; newline is itself a literal item when `include_literals` | `rows: LayoutRowItem[][]`, newlines become row boundaries | A better shape for a headless caller laying out a form | [`layout.ts`](packages/core/src/layout.ts) |
| `AddressUiComponent` | No required-field flag | `LayoutField.required` | Saves callers a second `isFieldRequired()` call | [`layout.ts`](packages/core/src/layout.ts) |
| `buildLayout()` | N/A (upstream has no headless layout concept) | No `options` (region choices) field | Building those needs an async `Supplier`; `buildLayout` stays synchronous like the formatter. Combine `buildLayout()` + `buildRegionTree()` yourself, or use `createAddressForm()`, which already does | [`layout.ts`](packages/core/src/layout.ts) |
| `Localization::GetErrorMessage` | Returns a resolved `std::string` | `getProblemMessage()` returns `{id, params}` | Headless: a consumer's own translation table keyed by the same ids is a drop-in alternative to `messages/en.ts` | [`messages.ts`](packages/core/src/messages.ts) |
| `ValidatingStorage`/`ValidatingUtil` | Wraps stored data with an MD5 checksum + timestamp | Timestamp (30-day TTL) only, no checksum | A pluggable, often non-file-backed `Storage` doesn't get corrupted the way flat files can; avoids needing a hash implementation in an otherwise zero-dependency library | [`internal/validating-storage.ts`](packages/core/src/internal/validating-storage.ts) |
| `PreloadSupplier::LoadRules` | A second call while a load is already pending silently drops that caller's callback | Concurrent `loadRules()` calls for the same region share/await the same in-flight promise | A Promise-based API needs every call to settle | [`supplier/preload.ts`](packages/core/src/supplier/preload.ts) |
| `PreloadSupplier` | No serialization | `export()` / `static from()` | Enables a server-loads-then-client-hydrates hand-off with no duplicate network fetch | [`supplier/preload.ts`](packages/core/src/supplier/preload.ts) |
| `StringCompare::NaturalEquals` | RE2 case-insensitive literal match | `toLocaleUpperCase()` comparison | Unicode-aware, but not guaranteed byte-identical to RE2 in every locale's edge cases | [`internal/string-compare.ts`](packages/core/src/internal/string-compare.ts) |
| `Rule::GetPostalCodeMatcher` | RE2 pattern | Native `RegExp`, no `u` flag | RE2 patterns in this dataset aren't written against JS's stricter Unicode-mode grammar | [`internal/rule.ts`](packages/core/src/internal/rule.ts) |
| `post_box_matchers.cc`'s `(?i)` prefix | RE2 inline case-insensitive flag | JS `i` flag | JS `RegExp` has no inline `(?i)` syntax | [`internal/post-box-matchers.ts`](packages/core/src/internal/post-box-matchers.ts) |
| `Rule` JSON keys | (an earlier draft of this project's own plan incorrectly claimed `Rule` also parses `upper`, `lang`, `key`, `sub_names`, `sub_lnames`, `sub_isoids`, `sub_zips`, `sub_mores`, `width_overrides`) | Not parsed — matches what `Rule::ParseJsonRule` in `rule.cc` actually reads | Verified directly against the vendored submodule; sub-region display names come from each sub-key's own rule, not arrays on the parent | [`internal/rule.ts`](packages/core/src/internal/rule.ts) |
| Form state (`createAddressForm`) | No upstream equivalent (Java's `AddressWidget`, the closest analog, isn't in this vendored submodule snapshot) | New design, no rendering, `subscribe`/`getState` is the only guaranteed contract | See `.planning/PLAN.md` §5/§6 Phase 7 | [`form/controller.ts`](packages/core/src/form/controller.ts) |
| React/Vue/etc. bindings | N/A | Not part of this library at all | Headless-by-design; see `examples/` | `.planning/PLAN.md` §7a |
| `FetchSource` default URL | `https://chromium-i18n.appspot.com/ssl-aggregate-address/` | `https://www.gstatic.com/chrome/autofill/libaddressinput/chromium-i18n/ssl-aggregate-address/` with fallback to legacy | In modern Google infrastructure the App Engine URL 302-redirects to GStatic CDN; querying GStatic directly eliminates the 302 round-trip and avoids CORS redirect failures and adblockers blocking `*.appspot.com` | [`source.ts`](packages/core/src/source.ts) |

## Data divergences

### Data source

Upstream's `RegionDataConstants` (used for e.g. `GetRegionData`,
`GetMaxLookupKeyDepth`) wraps a table compiled from `region_data_constants.cc`,
which is generated at Google's internal build time from CLDR data and **is
not checked into the OSS repository**. This library's fallback data
(`packages/core/src/data/fallback.ts`, regenerated by
`scripts/gen-fallback.ts`) is instead parsed from
`third_party/libaddressinput/testdata/countryinfo.txt` — the real,
version-controlled aggregate dataset upstream's own tests run against (via
`testdata_source.cc`). It uses the exact same `data/<CC>[/<sub>]=<json>`
schema, but is a smaller/older fixture than the live production dataset in
places. Everything below stems from that gap, not from a difference in how
this library interprets the data.

### Known instances

| Region(s) | Field | Upstream (production) | This library (OSS fixture) | Found in |
|---|---|---|---|---|
| US | `GetMaxLookupKeyDepth` | `2` (country/admin/locality) | `1` (country/admin only — no `data/US/<locality>` entries in the fixture) | Phase 2 |
| US | `fmt` (locality/admin separator) | `"%C, %S %Z"` (comma) | `"%C %S %Z"` (space) | Phase 3 |
| JP | `require` | Does not include `C` (LOCALITY) | Includes `C` — verified via `grep '^data/JP=' testdata/countryinfo.txt` | Phase 4 |
| CH | `GetMaxLookupKeyDepth` | `0` — curated: CH's `fmt` never uses `%S`, so admin-area data isn't surfaced as a UI level even though it exists (for postal-code prefix matching) | `1` — the fixture has `data/CH/<canton>` entries, so the depth this library computes from raw data presence is non-zero | Phase 5 |
| LV | `fmt` newline count | 4 newlines | 3 newlines (`"%N%n%O%n%A%n%C, %Z"`) | Phase 6 |
| CN | `languages` | `"zh"` (inferred from upstream's test expectations) | `"zh-hans"` | Phase 6 |
| HK | `languages` | `"zh-Hant~en"` (properly cased, inferred) | `"zh-hant~en"` (lowercase) | Phase 6 |

Each instance above was verified by grepping
`third_party/libaddressinput/testdata/countryinfo.txt` directly before
adjusting the corresponding ported test's expected value — see that test
file's inline comment for the specific grep and reasoning.

### What this means for you

- If you need byte-identical output to a Chromium build using upstream's
  live data server, don't rely on the bundled fallback data for the regions
  above — use `PreloadSupplier`/`OndemandSupplier` with a `Source` that
  points at the same live endpoint Chromium uses, and this library's
  *algorithms* (which are what's actually being ported and tested) will
  produce matching results from matching input data.
- The bundled fallback data is real, versioned, and good enough to develop
  and test against; it just isn't guaranteed to be current or field-complete
  for every region the way production data is.
- If you can supply a more current/complete dataset in the same aggregate
  JSON format (e.g. from your own snapshot of the production endpoint),
  `scripts/gen-fallback.ts` can be pointed at it to regenerate
  `data/fallback.ts`.
