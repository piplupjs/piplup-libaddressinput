// Ported from cpp/test/preload_supplier_test.cc (Apache-2.0, Google Inc.),
// using FallbackAggregateSource (built from the bundled dataset) in place
// of upstream's TestdataSource(/* aggregate= */ true).

import { beforeEach, describe, expect, it } from "vitest";
import { FallbackAggregateSource } from "../../test/fake-sources.js";
import { lookupKeyFromAddress } from "../internal/lookup-key.js";
import { NullStorage } from "../storage.js";
import { PreloadSupplier } from "./preload.js";

describe("PreloadSupplier (PreloadSupplierTest)", () => {
  let supplier: PreloadSupplier;

  beforeEach(() => {
    supplier = new PreloadSupplier(new FallbackAggregateSource(), new NullStorage());
  });

  it("loadRules reports success and marks the region loaded", async () => {
    const result = await supplier.loadRules("US");
    expect(result.success).toBe(true);
    expect(result.regionCode).toBe("US");
    expect(result.ruleCount).toBeGreaterThan(0);
    expect(supplier.isLoaded("US")).toBe(true);
  });

  it("gets the country rule (GetUsRule)", async () => {
    await supplier.loadRules("US");
    const key = lookupKeyFromAddress({ regionCode: "US" });
    const rule = supplier.getRule(key);
    expect(rule?.id).toBe("data/US");
  });

  it("gets a sub-region rule by key (GetUsCaRule)", async () => {
    await supplier.loadRules("US");
    const key = lookupKeyFromAddress({ regionCode: "US", administrativeArea: "CA" });
    const rule = supplier.getRule(key);
    expect(rule?.id).toBe("data/US/CA");
  });

  it("gets a sub-region rule by its human name (GetUsCaliforniaRule)", async () => {
    await supplier.loadRules("US");
    const key = lookupKeyFromAddress({
      regionCode: "US",
      administrativeArea: "California",
    });
    const rule = supplier.getRule(key);
    expect(rule?.id).toBe("data/US/CA");
  });

  it("gets a country rule with no sub-regions (GetZwRule)", async () => {
    await supplier.loadRules("ZW");
    const key = lookupKeyFromAddress({ regionCode: "ZW" });
    const rule = supplier.getRule(key);
    expect(rule?.id).toBe("data/ZW");
  });

  it("returns undefined for an unknown sub-region (GetUnknownRule)", async () => {
    await supplier.loadRules("US");
    const key = lookupKeyFromAddress({ regionCode: "US", administrativeArea: "ZZ" });
    expect(supplier.getRule(key)).toBeUndefined();
  });

  it("returns undefined for a too-precise key (GetTooPreciseRule)", async () => {
    await supplier.loadRules("US");
    const key = lookupKeyFromAddress({
      regionCode: "US",
      administrativeArea: "CA",
      locality: "Mountain View",
    });
    expect(supplier.getRule(key)).toBeUndefined();
  });

  it("lists every rule for a region (GetRulesForRegion)", async () => {
    await supplier.loadRules("CN");
    const rules = supplier.getRulesForRegion("CN");
    expect(rules.has("data/CN")).toBe(true);
    expect(rules.size).toBeGreaterThan(1);
  });

  it("supplies the full hierarchy for a key (SupplyRegionCode)", async () => {
    await supplier.loadRules("CA");
    const key = lookupKeyFromAddress({ regionCode: "CA", administrativeArea: "NB" });
    const result = await supplier.supply(key);
    expect(result.success).toBe(true);
    expect(result.hierarchy[0]?.id).toBe("data/CA");
    expect(result.hierarchy[1]?.id).toBe("data/CA/NB");
    expect(result.hierarchy[2]).toBeUndefined();
    expect(result.hierarchy[3]).toBeUndefined();
  });

  it("supplyGlobally matches supply for an in-language key (SupplyGloballyRegionCode)", async () => {
    await supplier.loadRules("CA");
    const key = lookupKeyFromAddress({ regionCode: "CA", administrativeArea: "NB" });
    const result = await supplier.supplyGlobally(key);
    expect(result.success).toBe(true);
    expect(result.hierarchy[1]?.id).toBe("data/CA/NB");
  });

  it("supplies via a human-readable region name (SupplyRegionName)", async () => {
    await supplier.loadRules("CA");
    const key = lookupKeyFromAddress({
      regionCode: "CA",
      administrativeArea: "New Brunswick",
    });
    const result = await supplier.supply(key);
    expect(result.success).toBe(true);
    expect(result.hierarchy[1]?.id).toBe("data/CA/NB");
  });

  it("dedupes concurrent loadRules calls for the same region", async () => {
    const [a, b] = await Promise.all([supplier.loadRules("FR"), supplier.loadRules("FR")]);
    expect(a).toEqual(b);
    expect(supplier.isLoaded("FR")).toBe(true);
  });

  it("computes the loaded rule depth (GetLoadedRuleDepth-equivalent)", async () => {
    await supplier.loadRules("CN");
    expect(supplier.getLoadedRuleDepth("CN")).toBeGreaterThan(1);
    await supplier.loadRules("ZW");
    expect(supplier.getLoadedRuleDepth("ZW")).toBe(1);
  });

  describe("export / from (server-to-client hand-off)", () => {
    it("rehydrates a supplier with no network access, matching the original", async () => {
      await supplier.loadRules("US");
      const exported = supplier.export();
      expect(Object.keys(exported)).toEqual(["US"]);

      // A source that fails every request: from() must not need it for the
      // regions already in `exported`.
      const offline = { async get() { return { success: false, data: undefined }; } };
      const rehydrated = PreloadSupplier.from(offline, new NullStorage(), exported);

      expect(rehydrated.isLoaded("US")).toBe(true);
      const key = lookupKeyFromAddress({ regionCode: "US", administrativeArea: "CA" });
      expect(rehydrated.getRule(key)?.id).toBe(supplier.getRule(key)?.id);
    });

    it("from() can still load further regions given a working source", async () => {
      await supplier.loadRules("US");
      const exported = supplier.export();
      const rehydrated = PreloadSupplier.from(new FallbackAggregateSource(), new NullStorage(), exported);
      expect(rehydrated.isLoaded("US")).toBe(true);
      expect(rehydrated.isLoaded("CA")).toBe(false);

      const result = await rehydrated.loadRules("CA");
      expect(result.success).toBe(true);
      expect(rehydrated.isLoaded("CA")).toBe(true);
    });
  });
});
