// Port of cpp/include/libaddressinput/preload_supplier.h + preload_supplier.cc
// (Apache-2.0, Google Inc.).
//
// Loads a whole region's address metadata in one aggregate request, indexes
// it by lookup key (and by human-readable/Latin sub-region names, so e.g.
// "California" or "Tokushima" resolve the same as "CA"/"徳島県"), and then
// answers Supply()/GetRule() synchronously from that cache.
//
// Divergence from upstream, worth knowing: `loadRules()` for a region that's
// already pending returns the SAME in-flight promise instead of doing
// nothing. Upstream's callback-based `LoadRules()` silently drops the
// second caller's callback when a load is already pending (see
// preload_supplier.cc) — fine for a native callback API where "you'll get
// notified some other time" is implicit, but a Promise-based API needs
// every call to settle, so we coalesce instead.

import {
  LOOKUP_KEY_HIERARCHY,
  lookupKeyFromAddress,
  lookupKeyRegionCode,
  lookupKeyToString,
  lookupKeyDepth,
  type LookupKey,
} from "../internal/lookup-key.js";
import * as RegionDataConstants from "../internal/region-data-constants.js";
import { parseJsonRule, type Rule } from "../internal/rule.js";
import { naturalKey } from "../internal/string-compare.js";
import { Retriever } from "../internal/retriever.js";
import type { Source } from "../source.js";
import type { Storage } from "../storage.js";
import {
  createEmptyRuleHierarchy,
  type RuleHierarchy,
  type Supplier,
  type SupplyResult,
} from "./supplier.js";

function keyFromRegionCode(regionCode: string): string {
  return lookupKeyToString(lookupKeyFromAddress({ regionCode }), 0);
}

// The length of "data/ZZ" — a depth-0 lookup key is always this long, since
// every region code is exactly 2 characters (verified by fallback.ts's
// generator against RegionCodeHasTwoCharacters' invariant).
const REGION_KEY_LENGTH = "data/ZZ".length;

export interface LoadRulesResult {
  success: boolean;
  regionCode: string;
  ruleCount: number;
}

export class PreloadSupplier implements Supplier {
  private readonly retriever: Retriever;
  private readonly pending = new Map<string, Promise<LoadRulesResult>>();
  private readonly loaded = new Set<string>();
  private readonly ruleIndex = new Map<string, Rule>();
  private readonly languageRuleIndex = new Map<string, Rule>();
  private readonly regionRules = new Map<string, Map<string, Rule>>();
  private readonly rawDataByRegion = new Map<string, string>();

  constructor(source: Source, storage: Storage) {
    this.retriever = new Retriever(source, storage);
  }

  /**
   * Serializes every loaded region's raw data, so it can be handed to
   * `PreloadSupplier.from()` elsewhere (typically: load on a server, embed
   * the result in the page, and rehydrate on the client with no further
   * network fetch — see examples/react-ssr).
   */
  export(): Record<string, string> {
    return Object.fromEntries(this.rawDataByRegion);
  }

  /**
   * Creates a `PreloadSupplier` pre-populated from a previous instance's
   * `export()` output — synchronously, no `source`/`storage` I/O. `source`
   * and `storage` are still required for loading any *further* regions
   * later via `loadRules()`.
   */
  static from(
    source: Source,
    storage: Storage,
    exported: Record<string, string>,
  ): PreloadSupplier {
    const supplier = new PreloadSupplier(source, storage);
    for (const [regionCode, data] of Object.entries(exported)) {
      const key = keyFromRegionCode(regionCode);
      const result = supplier.processAggregateData(regionCode, key, data);
      if (result.success) {
        supplier.rawDataByRegion.set(regionCode, data);
      }
    }
    return supplier;
  }

  /**
   * Loads all address metadata available for `regionCode`. Safe to call
   * repeatedly/concurrently for the same region: a load already in flight
   * is reused, and an already-loaded region resolves immediately.
   */
  async loadRules(regionCode: string): Promise<LoadRulesResult> {
    const key = keyFromRegionCode(regionCode);

    if (this.loaded.has(naturalKey(key))) {
      return { success: true, regionCode, ruleCount: 0 };
    }

    const inFlight = this.pending.get(key);
    if (inFlight !== undefined) {
      return inFlight;
    }

    const promise = this.doLoad(regionCode, key);
    this.pending.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }

  private async doLoad(regionCode: string, key: string): Promise<LoadRulesResult> {
    const { success, data } = await this.retriever.retrieve(key);
    if (!success) {
      return { success: false, regionCode, ruleCount: 0 };
    }
    const result = this.processAggregateData(regionCode, key, data);
    if (result.success) {
      this.rawDataByRegion.set(regionCode, data);
    }
    return result;
  }

  // Parses and indexes one region's already-fetched aggregate JSON text.
  // Shared by doLoad() (data just came from the retriever) and the
  // export()/from() hydration path below (data was serialized earlier, e.g.
  // on a server, and handed to us directly with no fetch at all).
  private processAggregateData(
    regionCode: string,
    key: string,
    data: string,
  ): LoadRulesResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return { success: false, regionCode, ruleCount: 0 };
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { success: false, regionCode, ruleCount: 0 };
    }

    let ruleCount = 0;
    const subRules: Rule[] = [];
    let regionMap = this.regionRules.get(regionCode);
    if (regionMap === undefined) {
      regionMap = new Map();
      this.regionRules.set(regionCode, regionMap);
    }

    for (const entry of Object.values(parsed as Record<string, unknown>)) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        return { success: false, regionCode, ruleCount: 0 };
      }
      const entryObj = entry as Record<string, unknown>;
      const id = typeof entryObj.id === "string" ? entryObj.id : undefined;
      if (id === undefined || id.length === 0) {
        return { success: false, regionCode, ruleCount: 0 };
      }

      const depth = id.split("/").length - 2;
      if (depth < 0 || depth >= LOOKUP_KEY_HIERARCHY.length) {
        return { success: false, regionCode, ruleCount: 0 };
      }

      const rule =
        depth === 0
          ? parseJsonRule(entryObj, RegionDataConstants.getDefaultRule())
          : parseJsonRule(entryObj);

      this.ruleIndex.set(naturalKey(id), rule);
      regionMap.set(id, rule);
      if (depth > 0) {
        subRules.push(rule);
      }
      ruleCount++;
    }

    this.indexHumanReadableNames(subRules);
    this.loaded.add(naturalKey(key));
    return { success: true, regionCode, ruleCount };
  }

  // Builds human-readable-name and Latin-name index entries for each
  // sub-region rule, e.g. "data/BR/São Paulo" -> the same Rule as
  // "data/BR/SP", by walking each rule's parent chain and joining their
  // `name`/`latinName` fields. Mirrors the second loop in
  // PreloadSupplier::Helper::OnRetrieved.
  private indexHumanReadableNames(subRules: Rule[]): void {
    for (const rule of subRules) {
      const hierarchy: Rule[] = [rule];
      let parentId = rule.id;
      for (;;) {
        const pos = parentId.lastIndexOf("/");
        if (pos === REGION_KEY_LENGTH) break; // reached COUNTRY level
        parentId = parentId.slice(0, pos);
        const parent = this.ruleIndex.get(naturalKey(parentId));
        if (parent === undefined) break; // shouldn't happen with well-formed data
        hierarchy.push(parent);
      }

      let humanId = rule.id.slice(0, REGION_KEY_LENGTH);
      let latinId = humanId;
      // Walk from the country level back down to the leaf, appending names.
      for (let i = hierarchy.length - 1; i >= 0; i--) {
        const level = hierarchy[i]!;
        humanId += "/";
        if (level.name.length > 0) {
          humanId += level.name;
        } else {
          const pos = level.id.lastIndexOf("/");
          humanId += level.id.slice(pos + 1);
        }
        if (level.latinName.length > 0) {
          latinId += `/${level.latinName}`;
        }
      }

      const id = rule.id;
      const langPos = id.lastIndexOf("--");
      if (langPos !== -1) {
        this.languageRuleIndex.set(naturalKey(humanId), rule);
        humanId += id.slice(langPos);
      }

      this.ruleIndex.set(naturalKey(humanId), rule);

      const humanSlashes = (humanId.match(/\//g) ?? []).length;
      const latinSlashes = (latinId.match(/\//g) ?? []).length;
      if (humanSlashes === latinSlashes) {
        this.ruleIndex.set(naturalKey(latinId), rule);
      }
    }
  }

  isLoaded(regionCode: string): boolean {
    return this.loaded.has(naturalKey(keyFromRegionCode(regionCode)));
  }

  isPending(regionCode: string): boolean {
    return this.pending.has(keyFromRegionCode(regionCode));
  }

  /** Throws if the region isn't loaded — call `isLoaded()` first. */
  getRulesForRegion(regionCode: string): ReadonlyMap<string, Rule> {
    const rules = this.regionRules.get(regionCode);
    if (rules === undefined) {
      throw new Error(`PreloadSupplier.getRulesForRegion: "${regionCode}" is not loaded`);
    }
    return rules;
  }

  /** Throws if the region isn't loaded — call `isLoaded()` first. */
  getRule(lookupKey: LookupKey): Rule | undefined {
    const hierarchy = this.getRuleHierarchy(lookupKey, false);
    if (hierarchy === undefined) return undefined;
    return hierarchy[lookupKeyDepth(lookupKey)];
  }

  async supply(lookupKey: LookupKey): Promise<SupplyResult> {
    const hierarchy = this.getRuleHierarchy(lookupKey, false);
    return {
      success: hierarchy !== undefined,
      lookupKey,
      hierarchy: hierarchy ?? createEmptyRuleHierarchy(),
    };
  }

  async supplyGlobally(lookupKey: LookupKey): Promise<SupplyResult> {
    const hierarchy = this.getRuleHierarchy(lookupKey, true);
    return {
      success: hierarchy !== undefined,
      lookupKey,
      hierarchy: hierarchy ?? createEmptyRuleHierarchy(),
    };
  }

  private getRuleHierarchy(
    lookupKey: LookupKey,
    searchGlobally: boolean,
  ): RuleHierarchy | undefined {
    const regionCode = lookupKeyRegionCode(lookupKey);
    if (!RegionDataConstants.isSupported(regionCode)) {
      // Matches upstream exactly: an unsupported region code is reported as
      // success with an empty hierarchy, not a failure.
      return createEmptyRuleHierarchy();
    }

    const hierarchy = createEmptyRuleHierarchy();
    const maxDepth = Math.min(
      lookupKeyDepth(lookupKey),
      RegionDataConstants.getMaxLookupKeyDepth(regionCode),
    );

    for (let depth = 0; depth <= maxDepth; depth++) {
      const key = lookupKeyToString(lookupKey, depth);
      let rule = this.ruleIndex.get(naturalKey(key));
      if (
        rule === undefined &&
        searchGlobally &&
        depth > 0 &&
        (hierarchy[0]?.languages.length ?? 0) > 0
      ) {
        rule = this.languageRuleIndex.get(naturalKey(key));
      }
      if (rule === undefined) {
        return depth > 0 ? hierarchy : undefined; // no COUNTRY-level data is failure
      }
      hierarchy[depth] = rule;
    }
    return hierarchy;
  }

  getLoadedRuleDepth(regionCode: string): number {
    let fullCode = keyFromRegionCode(regionCode).slice(0, REGION_KEY_LENGTH);
    let depth = 0;
    let rule = this.ruleIndex.get(naturalKey(fullCode));
    while (rule !== undefined) {
      depth++;
      if (rule.subKeys.length === 0) return depth;
      fullCode += `/${rule.subKeys[0]}`;
      rule = this.ruleIndex.get(naturalKey(fullCode));
    }
    return depth;
  }
}
