// Port of cpp/src/lookup_key.h / lookup_key.cc (Apache-2.0, Google Inc.).
//
// Maps an AddressData to the "data/<CC>/<sub>...[--<lang>]" key string used
// to look up address metadata, either in the bundled fallback dataset or
// from a remote/data supplier (Phase 2).

import type { AddressData } from "../address-data.js";
import type { AddressField } from "../address-field.js";
import { parseLanguage } from "./language.js";
import * as RegionDataConstants from "./region-data-constants.js";
import { parseRule } from "./rule.js";

/** Mirrors LookupKey::kHierarchy: the levels a lookup key can descend through. */
export const LOOKUP_KEY_HIERARCHY: readonly AddressField[] = [
  "COUNTRY",
  "ADMIN_AREA",
  "LOCALITY",
  "DEPENDENT_LOCALITY",
];

const UNKNOWN_REGION = "ZZ";

function fieldValue(address: AddressData, field: AddressField): string {
  switch (field) {
    case "COUNTRY":
      return address.regionCode;
    case "ADMIN_AREA":
      return address.administrativeArea ?? "";
    case "LOCALITY":
      return address.locality ?? "";
    case "DEPENDENT_LOCALITY":
      return address.dependentLocality ?? "";
    default:
      return "";
  }
}

// Mirrors ShouldSetLanguageForKey in lookup_key.cc. `languageTagNoLatn` is
// assumed to already have any "-Latn" script subtag stripped, as upstream
// requires of its caller.
function shouldSetLanguageForKey(languageTagNoLatn: string, regionCode: string): boolean {
  // We only need a language in the key if there is subregion data at all.
  if (RegionDataConstants.getMaxLookupKeyDepth(regionCode) === 0) {
    return false;
  }
  const rule = parseRule(RegionDataConstants.getRegionData(regionCode));
  if (rule === undefined) {
    return false;
  }
  const languages = rule.languages;
  // Do not add the default language (we want "data/US", not "data/US--en").
  if (languages.length === 0 || languages[0] === languageTagNoLatn) {
    return false;
  }
  const target = languageTagNoLatn.toLowerCase();
  return languages.slice(1).some((tag) => tag.toLowerCase() === target);
}

export interface LookupKey {
  /** Ordered nodes from COUNTRY down to however deep the address goes. */
  readonly nodes: ReadonlyMap<AddressField, string>;
  readonly language: string;
}

/** Builds a LookupKey from an address, mirroring `LookupKey::FromAddress`. */
export function lookupKeyFromAddress(address: AddressData): LookupKey {
  const nodes = new Map<AddressField, string>();

  if (address.regionCode.length === 0) {
    nodes.set("COUNTRY", UNKNOWN_REGION);
  } else {
    for (const field of LOOKUP_KEY_HIERARCHY) {
      const value = fieldValue(address, field);
      if (value.length === 0) {
        // It would be impossible to find any data for an empty field value.
        break;
      }
      if (value.includes("/")) {
        // The address metadata server does not have data for any fields
        // with a slash in their value: "/" is the lookup-key syntax
        // character.
        break;
      }
      nodes.set(field, value);
    }
  }

  const addressLanguage = parseLanguage(address.languageCode ?? "");
  const languageTagNoLatn = addressLanguage.hasLatinScript
    ? addressLanguage.base
    : addressLanguage.tag;

  const language = shouldSetLanguageForKey(languageTagNoLatn, address.regionCode)
    ? languageTagNoLatn
    : "";

  return { nodes, language };
}

/**
 * Builds a LookupKey one level deeper than `parent`, with `childNode` as the
 * next node's value. Mirrors `LookupKey::FromLookupKey`.
 */
export function lookupKeyFromParent(parent: LookupKey, childNode: string): LookupKey {
  if (parent.nodes.size >= LOOKUP_KEY_HIERARCHY.length) {
    throw new Error("lookupKeyFromParent: parent is already at max depth");
  }
  if (childNode.length === 0) {
    throw new Error("lookupKeyFromParent: childNode must not be empty");
  }
  const nodes = new Map(parent.nodes);
  const childField = LOOKUP_KEY_HIERARCHY[nodes.size]!;
  nodes.set(childField, childNode);
  return { nodes, language: parent.language };
}

/**
 * Returns the key string, including nodes down to `maxDepth` (0 = country
 * only) and the "--<language>" suffix if one was set. Mirrors
 * `LookupKey::ToKeyString`.
 */
export function lookupKeyToString(key: LookupKey, maxDepth: number): string {
  if (maxDepth < 0 || maxDepth >= LOOKUP_KEY_HIERARCHY.length) {
    throw new Error(
      `lookupKeyToString: maxDepth must be in [0, ${LOOKUP_KEY_HIERARCHY.length - 1}]`,
    );
  }
  let result = "data";
  for (let i = 0; i <= maxDepth; i++) {
    const field = LOOKUP_KEY_HIERARCHY[i]!;
    const value = key.nodes.get(field);
    if (value === undefined) break;
    result += `/${value}`;
  }
  if (key.language.length > 0) {
    result += `--${key.language}`;
  }
  return result;
}

/** Mirrors `LookupKey::GetRegionCode`. Throws if the key has no COUNTRY node. */
export function lookupKeyRegionCode(key: LookupKey): string {
  const regionCode = key.nodes.get("COUNTRY");
  if (regionCode === undefined) {
    throw new Error("lookupKeyRegionCode: key has no COUNTRY node");
  }
  return regionCode;
}

/** Mirrors `LookupKey::GetDepth`. */
export function lookupKeyDepth(key: LookupKey): number {
  return key.nodes.size - 1;
}
