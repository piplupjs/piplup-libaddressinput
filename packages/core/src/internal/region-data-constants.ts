// Port of cpp/src/region_data_constants.h (Apache-2.0, Google Inc.).
//
// Synchronous, always-available access to the bundled fallback dataset (see
// data/fallback.ts and .planning/PLAN.md Phase 1/2). Upstream's
// RegionDataConstants wraps a compiled-in table generated at Google's
// internal build time; ours wraps the generated fallback.ts instead.
//
// Divergence from upstream, worth knowing: our depths are computed from the
// offline testdata/countryinfo.txt fixture, which for some regions (e.g. the
// US) is shallower than the real production dataset — see fallback.ts's
// header comment and .planning/PLAN.md Phase 2. Live data loaded through a
// supplier (Phase 2) is authoritative; this module is the synchronous
// fallback used before/without a network fetch.

import {
  FALLBACK_DATA,
  FALLBACK_DEFAULT_REGION_DATA,
  FALLBACK_MAX_LOOKUP_KEY_DEPTH,
  FALLBACK_REGION_CODES,
} from "../data/fallback.js";
import { parseRule, type Rule } from "./rule.js";

export function isSupported(regionCode: string): boolean {
  return Object.prototype.hasOwnProperty.call(FALLBACK_DATA, `data/${regionCode}`);
}

/** All supported top-level region codes, sorted (matches upstream's invariant). */
export function getRegionCodes(): readonly string[] {
  return FALLBACK_REGION_CODES;
}

/**
 * Returns the raw JSON text for a "data/<CC>[/<sub...>]" key, or "" if
 * there's no data for it — matching upstream's GetRegionData, which also
 * returns an empty string for unknown keys/region codes.
 */
export function getRegionData(key: string): string {
  const normalizedKey = key.startsWith("data/") ? key : `data/${key}`;
  return FALLBACK_DATA[normalizedKey] ?? "";
}

export function getDefaultRegionData(): string {
  return FALLBACK_DEFAULT_REGION_DATA;
}

export function getMaxLookupKeyDepth(regionCode: string): number {
  return FALLBACK_MAX_LOOKUP_KEY_DEPTH[regionCode] ?? 0;
}

let defaultRule: Rule | undefined;

/** The parsed "ZZ" default rule, mirroring `Rule::GetDefault()`. Cached. */
export function getDefaultRule(): Rule {
  if (defaultRule === undefined) {
    const parsed = parseRule(FALLBACK_DEFAULT_REGION_DATA);
    if (parsed === undefined) {
      throw new Error("region-data-constants: default rule (data/ZZ) failed to parse");
    }
    defaultRule = parsed;
  }
  return defaultRule;
}
