// Port of cpp/include/libaddressinput/supplier.h (Apache-2.0, Google Inc.).

import type { LookupKey } from "../internal/lookup-key.js";
import { LOOKUP_KEY_HIERARCHY } from "../internal/lookup-key.js";
import type { Rule } from "../internal/rule.js";

/**
 * The hierarchical list of Rules for a LookupKey, one slot per level of
 * `LOOKUP_KEY_HIERARCHY` (COUNTRY, ADMIN_AREA, LOCALITY, DEPENDENT_LOCALITY).
 * A slot is `undefined` if that level wasn't reached/loaded.
 */
export type RuleHierarchy = (Rule | undefined)[];

export function createEmptyRuleHierarchy(): RuleHierarchy {
  return new Array(LOOKUP_KEY_HIERARCHY.length).fill(undefined) as RuleHierarchy;
}

export interface SupplyResult {
  success: boolean;
  lookupKey: LookupKey;
  hierarchy: RuleHierarchy;
}

/**
 * Supplies the metadata needed to validate/format/lay out an address for a
 * given LookupKey. Implementations may load data on demand or fail if the
 * necessary data hasn't already been loaded (see PreloadSupplier).
 */
export interface Supplier {
  supply(lookupKey: LookupKey): Promise<SupplyResult>;
  /** Like `supply`, but also looks across all loaded languages for a match. */
  supplyGlobally(lookupKey: LookupKey): Promise<SupplyResult>;
  /** Depth of rule data actually available for a region (0 if none/unloaded). */
  getLoadedRuleDepth(regionCode: string): number;
}
