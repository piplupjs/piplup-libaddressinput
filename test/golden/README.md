# Golden cross-check

This directory holds a corpus of test addresses (`corpus.json`), this
library's output for each (`js-output.json`), and — as of this writing —
**a real, independently-compiled C++ build of upstream's own
`GetFormattedNationalAddress` and `AddressValidator::Validate` output for the same corpus**
(`cpp-output.json`), which matches the JS port **24/24 entries for both formatting
(byte for byte) and validation problems (order-insensitively)**. This is the golden cross-check
described in `.planning/PLAN.md` §6 Phase 8.

## Reproducing it

```bash
node --experimental-strip-types scripts/gen-golden-js.ts   # writes js-output.json
bash test/golden/cpp-harness/build.sh                      # builds+runs the C++ side, writes
                                                             # cpp-output.json, then diffs both
```

`cpp-harness/build.sh` fetches RE2 and rapidjson (build-only dependencies,
not vendored — see the script), builds them, compiles a small C++ driver
(`cpp-harness/main.cc`) that links directly against
`third_party/libaddressinput/cpp/src/*.cc` and `cpp/test/testdata_source.cc` — upstream's
real, unmodified source, not a reimplementation — and runs it over `corpus.json`. It needs a
C++17 compiler, CMake, and Ninja (or equivalents); verified working with
MinGW-W64 GCC 16.1.0 + CMake 4.4.1 + Ninja 1.13.2 on Windows, and should work
the same way with `g++`/`cmake`/`ninja` from `apt-get` on Linux CI.

`region_data_constants_impl.cc` (in `cpp-harness/`, not upstream) is the one
piece that isn't upstream code: it implements `RegionDataConstants` by
parsing `testdata/countryinfo.txt` at startup (see `DIVERGENCES.md`: upstream's
real `region_data_constants.cc` is generated at Google's internal build time).

The JS side now also uses `testdata/countryinfo.txt` explicitly — via `FixtureDataSource`
in `gen-golden-js.ts` — rather than the bundled live snapshot. This ensures:

1. Algorithm correctness is tested against stable fixture data
2. Data freshness (the live snapshot) doesn't affect algorithm tests
3. Both C++ and JS sides read the same input, confirming _porting algorithms_
   are correct, independent of any data-source difference

## Scope: what's covered, what isn't

`GetFormattedNationalAddress` (→ `formatAddress()`) and `AddressValidator::Validate`
(→ `validate()`) are both cross-checked this way. `BuildComponents` and
`AddressNormalizer` aren't yet wired into the C++ harness. Extending
`cpp-harness/main.cc` to cover them is described in "Extending this" below.

## Comparison details: normalization and validation problems

1. **Normalization**: `formatAddress()` never itself normalizes (matches upstream:
   `GetFormattedNationalAddress` doesn't call `AddressNormalizer`) — so does the
   C++ harness, which has no normalizer wired up. `js-output.json` therefore has
   two formatted fields:
   - **`formattedRaw`** — `formatAddress(address)` on the address exactly as
     given in `corpus.json`. This is what `cpp-harness/compare.cjs` diffs
     against `cpp-output.json`'s `formatted` field — a true apples-to-apples
     comparison, and where the 24/24 match comes from.
   - **`formatted`** — `formatAddress(normalize(supplier, address))`, i.e. what
     a consumer following the README's quick start actually gets. This
     legitimately differs from the C++ side for entries like BR (where
     `administrativeArea: "São Paulo"` normalizes to `"SP"` before formatting).

2. **Validation problems**: upstream's `AddressValidator` reports problems using
   `std::multimap<AddressField, AddressProblem>`, which is ordered by field enum key.
   The JS port returns an array of problem objects in check execution order.
   `compare.cjs` sorts both sides by `(field, problem)` before asserting equality,
   exactly matching the order-insensitivity of `multimap` and `packages/core/src/validator.test.ts`.
   The JS snapshot includes:
   - **`problemsOffline`** — validated using a `PreloadSupplier` backed by
     `FixtureDataSource(aggregate: true)`, which serves the test fixture
     (`testdata/countryinfo.txt`). This is the same data the C++ harness uses,
     so this field is what `compare.cjs` compares against `cpp-output.json`'s
     `problems` field.
   - **`problems`** — validated using a `PreloadSupplier` with a live `FetchSource`
     against `chromium-i18n.appspot.com`.

## Regenerating

```bash
pnpm --filter @piplup/libaddressinput build
node --experimental-strip-types scripts/gen-golden-js.ts
bash test/golden/cpp-harness/build.sh
git diff test/golden/                    # review what changed and why
```

Across runs with no code changes:

- `formattedRaw`, `problemsOffline`, and `cpp-output.json` are all stable
  — they're derived from the checked-in `testdata/countryinfo.txt` fixture
  via `FixtureDataSource`.
- `problems` field can change even with no code changes: it uses a live `FetchSource`
  against `chromium-i18n.appspot.com`, so it reflects whatever that endpoint
  currently returns.

## Extending this

To cross-check `buildLayout()`/`BuildComponents` or `normalize()`/`AddressNormalizer`
the same way:

- For `BuildComponents`, `cpp-harness/main.cc` can compare structural layout:
  field order, row grouping, length hints (`short`/`long`), and required flags.
  Real GRIT-generated label text isn't available without Google's internal build
  tooling (`messages.grdp` string IDs only).
- For `AddressNormalizer`, call `AddressNormalizer::Normalize` on a mutable copy
  of the address and compare against `js-output.json`'s `normalized` field.
