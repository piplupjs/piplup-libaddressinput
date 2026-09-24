import { getRegionCodes } from "../layout.js";
import type { RegionData } from "../region-data.js";

export interface RegionOption {
  /** 2-letter CLDR/ISO 3166-1 alpha-2 region code (e.g. "US", "IN", "JP"). */
  code: string;
  /** Localized region name (e.g. "United States", "India", "Japan"). */
  name: string;
}

/**
 * Returns all supported region codes with localized display names.
 * By default, sorts options alphabetically by localized display name.
 *
 * @param locale BCP-47 language tag for display names (default: "en").
 */
export function getRegionOptions(locale = "en"): RegionOption[] {
  let displayNames: Intl.DisplayNames | undefined;
  try {
    displayNames = new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    // Environment may lack Intl.DisplayNames
  }

  const options: RegionOption[] = getRegionCodes().map((code) => {
    let name = code;
    if (displayNames !== undefined) {
      try {
        const resolved = displayNames.of(code);
        if (resolved && resolved.length > 0) {
          name = resolved;
        }
      } catch {
        // Fall back to raw code
      }
    }
    return { code, name };
  });

  return options.sort((a, b) => a.name.localeCompare(b.name, locale));
}

/**
 * Formats a sub-region (state/province/locality) option label cleanly without duplication.
 *
 * E.g.:
 * - When name and key differ (e.g. US States): `"California (CA)"`
 * - When name and key are identical (e.g. Indian States): `"Uttar Pradesh"`
 * - When name is missing: `"CA"`
 */
export function formatRegionOption(sub: { key: string; name?: string }): string {
  if (sub.name && sub.name !== sub.key) {
    return `${sub.name} (${sub.key})`;
  }
  return sub.name || sub.key;
}

/**
 * Traverses a RegionData tree to find the subregions belonging to a given
 * parent key or localized name.
 *
 * @param tree The root RegionData tree (from buildRegionTree() or form.getState().regionTree).
 * @param parentKeyOrName The parent key (e.g. "CA") or name (e.g. "California").
 */
export function findSubRegions(
  tree: RegionData | null,
  parentKeyOrName: string | undefined,
): RegionData[] {
  if (tree === null || parentKeyOrName === undefined || parentKeyOrName === "") {
    return [];
  }
  const match = tree.subRegions.find(
    (r) => r.key === parentKeyOrName || r.name === parentKeyOrName,
  );
  return match?.subRegions ?? [];
}
