// Port of cpp/src/util/string_compare.h / .cc (Apache-2.0, Google Inc.).
//
// Upstream's StringCompare does case-insensitive matching (via RE2's
// case-insensitive literal match) so that e.g. sub-region names/keys typed
// in a different case than the data still match ("ca" == "CA"). It also
// provides NaturalLess for use as a `std::map` key comparator.
//
// Divergence, worth knowing: we fold case with `toLocaleUpperCase()` (see
// naturalKey below) rather than RE2's case folding. This is Unicode-aware
// (handles e.g. German "ß"/"SS", Turkish dotted/dotless I reasonably) but
// isn't guaranteed byte-identical to RE2 in every locale's edge cases. If
// golden tests (Phase 8) turn up a mismatch, revisit here.
//
// We don't port NaturalLess itself: everywhere upstream uses it is a
// `std::map` ordered purely so `find()`/`emplace_hint()` can do
// case-insensitive lookup, never for the iteration order itself. A plain
// `Map` keyed by `naturalKey(id)` gets the same lookup behavior more simply
// (see supplier/preload.ts).

export function naturalKey(value: string): string {
  return value.toLocaleUpperCase();
}

export function naturalEquals(a: string, b: string): boolean {
  return naturalKey(a) === naturalKey(b);
}
