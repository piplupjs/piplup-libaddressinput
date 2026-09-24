// Port of cpp/include/libaddressinput/address_normalizer.h + .cc
// (Apache-2.0, Google Inc.).
//
// Divergence from upstream, by design: `Normalize` mutates its argument
// in-place. This port returns a new AddressData instead (`normalize()`),
// matching this library's general immutable-input convention (see
// .planning/PLAN.md §3, design decision 6) — the original object is never
// modified.

import type { AddressData } from "./address-data.js";
import { isFieldEmpty, getFieldValue } from "./address-data.js";
import { LOOKUP_KEY_HIERARCHY, lookupKeyFromAddress, lookupKeyFromParent, type LookupKey } from "./internal/lookup-key.js";
import { naturalEquals } from "./internal/string-compare.js";
import type { PreloadSupplier } from "./supplier/preload.js";

const HIERARCHY_FIELD_KEYS = {
  ADMIN_AREA: "administrativeArea",
  LOCALITY: "locality",
  DEPENDENT_LOCALITY: "dependentLocality",
} as const;

/**
 * Returns a copy of `address` with its administrative-area/locality/
 * dependent-locality values converted to their canonical form (e.g.
 * "California" -> "CA"), by matching against `supplier`'s loaded rules.
 * `supplier` must already have the address's region loaded
 * (`supplier.isLoaded(address.regionCode)`).
 *
 * Mirrors `AddressNormalizer::Normalize`.
 */
export function normalize(supplier: PreloadSupplier, address: AddressData): AddressData {
  const result: AddressData = { ...address };

  let parentKey: LookupKey = lookupKeyFromAddress({ regionCode: address.regionCode });
  let parentRule = supplier.getRule(parentKey);
  if (parentRule === undefined) {
    // Mirrors upstream's assert (supplier->IsLoaded() is a precondition);
    // fail soft here instead of throwing, since JS has no debug-only assert.
    return result;
  }

  const languages =
    parentRule.languages.length === 0
      ? [""]
      : ["", ...parentRule.languages.slice(1)]; // Default language needs no tag.

  for (let depth = 1; depth < LOOKUP_KEY_HIERARCHY.length; depth++) {
    const field = LOOKUP_KEY_HIERARCHY[depth]!;
    if (isFieldEmpty(result, field)) {
      return result;
    }
    const fieldValue = getFieldValue(result, field);
    let matched = false;

    for (const subKey of parentRule.subKeys) {
      if (matched) break;
      for (const languageTag of languages) {
        const lookupKey: LookupKey = {
          ...lookupKeyFromParent(parentKey, subKey),
          language: languageTag,
        };
        const rule = supplier.getRule(lookupKey);
        // A rule with this key and language tag was expected in a certain
        // format (e.g. data/CA/QC--fr) but wasn't found — a possible
        // inconsistency in the data. Matches upstream's `continue`.
        if (rule === undefined) continue;

        const matchesLatinName = naturalEquals(fieldValue, rule.latinName);
        const matchesLocalNameId =
          naturalEquals(fieldValue, subKey) || naturalEquals(fieldValue, rule.name);
        if (matchesLatinName || matchesLocalNameId) {
          const key = HIERARCHY_FIELD_KEYS[field as keyof typeof HIERARCHY_FIELD_KEYS];
          result[key] = matchesLatinName ? rule.latinName : subKey;
          matched = true;
          parentKey = lookupKeyFromParent(parentKey, subKey);
          const nextParentRule = supplier.getRule(parentKey);
          if (nextParentRule === undefined) {
            return result; // Same soft-fail as above.
          }
          parentRule = nextParentRule;
          break;
        }
      }
    }
    if (!matched) {
      return result; // Abort search.
    }
  }

  return result;
}
