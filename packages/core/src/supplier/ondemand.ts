// Port of cpp/include/libaddressinput/ondemand_supplier.h +
// ondemand_supplier.cc + ondemand_supply_task.h/.cc (Apache-2.0, Google Inc.).
//
// Unlike PreloadSupplier, this fetches (and caches) exactly the lookup-key
// levels needed for one LookupKey at a time, rather than a whole region's
// data up front. No human-readable-name index is built — the real metadata
// server does synonym resolution server-side for on-demand lookups, so a
// rule can come back with an `id` different from the key requested; this
// cache is keyed by the returned rule's `id`, same as upstream.

import { LOOKUP_KEY_HIERARCHY, lookupKeyDepth, lookupKeyRegionCode, lookupKeyToString, type LookupKey } from "../internal/lookup-key.js";
import * as RegionDataConstants from "../internal/region-data-constants.js";
import { parseRule, type Rule } from "../internal/rule.js";
import { Retriever } from "../internal/retriever.js";
import type { Source } from "../source.js";
import type { Storage } from "../storage.js";
import { createEmptyRuleHierarchy, type RuleHierarchy, type Supplier, type SupplyResult } from "./supplier.js";

export class OndemandSupplier implements Supplier {
  private readonly retriever: Retriever;
  private readonly ruleCache = new Map<string, Rule>();

  constructor(source: Source, storage: Storage) {
    this.retriever = new Retriever(source, storage);
  }

  // For now, identical to supply() — matches upstream's comment verbatim.
  async supplyGlobally(lookupKey: LookupKey): Promise<SupplyResult> {
    return this.supply(lookupKey);
  }

  async supply(lookupKey: LookupKey): Promise<SupplyResult> {
    const hierarchy = createEmptyRuleHierarchy();
    const toFetch: { depth: number; key: string }[] = [];

    const regionCode = lookupKeyRegionCode(lookupKey);
    if (RegionDataConstants.isSupported(regionCode)) {
      const maxDepth = Math.min(
        lookupKeyDepth(lookupKey),
        RegionDataConstants.getMaxLookupKeyDepth(regionCode),
      );
      for (let depth = 0; depth <= maxDepth; depth++) {
        const key = lookupKeyToString(lookupKey, depth);
        const cached = this.ruleCache.get(key);
        if (cached !== undefined) {
          hierarchy[depth] = cached;
        } else {
          toFetch.push({ depth, key });
        }
      }
    }

    let success = true;
    await Promise.all(
      toFetch.map(async ({ depth, key }) => {
        const ok = await this.load(depth, key, hierarchy);
        if (!ok) success = false;
      }),
    );

    return { success, lookupKey, hierarchy };
  }

  private async load(
    depth: number,
    key: string,
    hierarchy: RuleHierarchy,
  ): Promise<boolean> {
    const result = await this.retriever.retrieve(key);
    if (!result.success) {
      return false;
    }
    // The address metadata server returns "{}" for a successful lookup that
    // found no data for that key; that's not an error, just nothing to add.
    if (result.data === "{}") {
      return true;
    }

    const base =
      LOOKUP_KEY_HIERARCHY[depth] === "COUNTRY"
        ? RegionDataConstants.getDefaultRule()
        : undefined;
    const rule = parseRule(result.data, base);
    if (rule === undefined) {
      return false;
    }

    const existing = this.ruleCache.get(rule.id);
    if (existing !== undefined) {
      hierarchy[depth] = existing;
    } else {
      this.ruleCache.set(rule.id, rule);
      hierarchy[depth] = rule;
    }
    return true;
  }

  // OndemandSupplier doesn't track "how deep is the loaded data" the way
  // PreloadSupplier does — matches upstream, which always returns the full
  // hierarchy depth here.
  getLoadedRuleDepth(_regionCode: string): number {
    return LOOKUP_KEY_HIERARCHY.length;
  }
}
