// Port of cpp/include/libaddressinput/region_data.h +
// region_data_builder.h/.cc (Apache-2.0, Google Inc.).
//
// Reshaped as a plain, JSON-serializable tree (see .planning/PLAN.md §1.2):
// upstream's `RegionData` nodes carry a `parent()` back-reference, which
// would make the tree circular and non-serializable. Nothing in upstream's
// own algorithm actually needs the parent pointer while building the tree —
// only `has_parent()`/`parent()` accessors expose it — so it's dropped here.
//
// Also dropped: `RegionDataBuilder`'s internal per-(region, language) cache.
// It's a pure performance optimization (memoizing an otherwise-pure build);
// callers who want it can memoize `buildRegionTree()` themselves on
// `(regionCode, bestLanguageTag)`.

import {
  LOOKUP_KEY_HIERARCHY,
  lookupKeyDepth,
  lookupKeyFromAddress,
  lookupKeyFromParent,
  lookupKeyToString,
  type LookupKey,
} from "./internal/lookup-key.js";
import { chooseBestAddressLanguage, parseLanguage } from "./internal/language.js";
import * as RegionDataConstants from "./internal/region-data-constants.js";
import { parseRule, type Rule } from "./internal/rule.js";
import type { PreloadSupplier } from "./supplier/preload.js";

export interface RegionData {
  key: string;
  name: string;
  subRegions: RegionData[];
}

export interface BuildRegionTreeResult {
  tree: RegionData;
  /**
   * The BCP-47 tag of the language actually used for `name`s in the tree
   * (may differ from `uiLanguageTag` — see `chooseBestAddressLanguage`).
   * Empty when the region declares no languages at all... actually "und"
   * when the rule declares no languages (matches upstream's kUndefinedLanguage).
   */
  bestLanguageTag: string;
}

const MAX_LOOKUP_KEY_DEPTH = LOOKUP_KEY_HIERARCHY.length - 1;

function buildRegionTreeRecursively(
  rules: ReadonlyMap<string, Rule>,
  parentKey: LookupKey,
  parentRegion: RegionData,
  keys: readonly string[],
  preferLatinName: boolean,
  regionMaxDepth: number,
): void {
  for (const key of keys) {
    const childKey = lookupKeyFromParent(parentKey, key);
    const rule = rules.get(lookupKeyToString(childKey, MAX_LOOKUP_KEY_DEPTH));
    // Matches upstream exactly: a missing rule aborts the *rest* of this
    // sibling list too, not just this one key.
    if (rule === undefined) {
      return;
    }

    const localName = rule.name.length === 0 ? key : rule.name;
    const name = preferLatinName && rule.latinName.length > 0 ? rule.latinName : localName;
    const region: RegionData = { key, name, subRegions: [] };
    parentRegion.subRegions.push(region);

    if (rule.subKeys.length > 0 && regionMaxDepth > lookupKeyDepth(parentKey)) {
      buildRegionTreeRecursively(rules, childKey, region, rule.subKeys, preferLatinName, regionMaxDepth);
    }
  }
}

function buildRegion(
  rules: ReadonlyMap<string, Rule>,
  regionCode: string,
  language: ReturnType<typeof parseLanguage>,
): RegionData {
  const lookupKey = lookupKeyFromAddress({ regionCode });
  const rootRule = rules.get(lookupKeyToString(lookupKey, MAX_LOOKUP_KEY_DEPTH));
  if (rootRule === undefined) {
    throw new Error(`buildRegionTree: no rule for region "${regionCode}" (is it loaded?)`);
  }

  const region: RegionData = { key: regionCode, name: regionCode, subRegions: [] };

  // If there are sub-keys for a field the region doesn't actually use (e.g.
  // CH has ADMIN_AREA sub-keys but doesn't use ADMIN_AREA), they're skipped.
  const regionMaxDepth = RegionDataConstants.getMaxLookupKeyDepth(regionCode);
  if (regionMaxDepth > 0) {
    buildRegionTreeRecursively(
      rules,
      lookupKey,
      region,
      rootRule.subKeys,
      language.hasLatinScript,
      regionMaxDepth,
    );
  }

  return region;
}

/**
 * Builds the tree of administrative subdivisions for `regionCode` (for use
 * in e.g. a cascading admin-area/locality dropdown UI), in the best
 * language for `uiLanguageTag` that the region's data supports. Mirrors
 * `RegionDataBuilder::Build`.
 *
 * `supplier` must already have `regionCode` loaded
 * (`supplier.isLoaded(regionCode)`).
 */
export function buildRegionTree(
  supplier: PreloadSupplier,
  regionCode: string,
  uiLanguageTag: string,
): BuildRegionTreeResult {
  // No need to merge with the default rule: only `languages` and the Latin
  // format are read here, neither of which the default rule ever sets.
  const rule = parseRule(RegionDataConstants.getRegionData(regionCode)) ?? {
    languages: [] as string[],
    latinFormat: [],
  };
  const bestLanguage =
    rule.languages.length === 0
      ? parseLanguage("und")
      : chooseBestAddressLanguage(rule as Rule, parseLanguage(uiLanguageTag));

  const rules = supplier.getRulesForRegion(regionCode);
  const tree = buildRegion(rules, regionCode, bestLanguage);

  return { tree, bestLanguageTag: bestLanguage.tag };
}
