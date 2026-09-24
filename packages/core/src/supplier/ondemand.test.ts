// Adapted from cpp/test/ondemand_supplier_test.cc (Apache-2.0, Google Inc.).
// OndemandSupplier fetches per-level, non-aggregate keys, so it's tested
// against MapSource/FixtureDataSource rather than the aggregate fake.

import { describe, expect, it } from "vitest";
import { FixtureDataSource } from "../../test/fake-sources.js";
import { lookupKeyFromAddress } from "../internal/lookup-key.js";
import { NullStorage } from "../storage.js";
import { OndemandSupplier } from "./ondemand.js";

describe("OndemandSupplier", () => {
  it("supplies the country rule", async () => {
    const supplier = new OndemandSupplier(new FixtureDataSource(false), new NullStorage());
    const key = lookupKeyFromAddress({ regionCode: "US" });
    const result = await supplier.supply(key);
    expect(result.success).toBe(true);
    expect(result.hierarchy[0]?.id).toBe("data/US");
  });

  it("supplies a sub-region rule by key", async () => {
    const supplier = new OndemandSupplier(new FixtureDataSource(false), new NullStorage());
    const key = lookupKeyFromAddress({ regionCode: "US", administrativeArea: "CA" });
    const result = await supplier.supply(key);
    expect(result.success).toBe(true);
    expect(result.hierarchy[0]?.id).toBe("data/US");
    expect(result.hierarchy[1]?.id).toBe("data/US/CA");
  });

  it("caches a rule across requests for the same key", async () => {
    const supplier = new OndemandSupplier(new FixtureDataSource(false), new NullStorage());
    const key = lookupKeyFromAddress({ regionCode: "US" });
    const first = await supplier.supply(key);
    const second = await supplier.supply(key);
    expect(second.hierarchy[0]).toBe(first.hierarchy[0]); // same cached object
  });

  it("reports success with an empty hierarchy for an unsupported region", async () => {
    const supplier = new OndemandSupplier(new FixtureDataSource(false), new NullStorage());
    const key = lookupKeyFromAddress({ regionCode: "ZZ" });
    const result = await supplier.supply(key);
    expect(result.success).toBe(true);
    expect(result.hierarchy[0]).toBeUndefined();
  });

  it("getLoadedRuleDepth always returns the full hierarchy length", () => {
    const supplier = new OndemandSupplier(new FixtureDataSource(false), new NullStorage());
    expect(supplier.getLoadedRuleDepth("US")).toBe(4);
  });
});
