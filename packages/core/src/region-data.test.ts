// Ported from cpp/test/region_data_builder_test.cc (Apache-2.0, Google Inc.).

import { beforeEach, describe, expect, it } from "vitest";
import { FixtureDataSource } from "../test/fake-sources.js";
import { buildRegionTree } from "./region-data.js";
import { NullStorage } from "./storage.js";
import { PreloadSupplier } from "./supplier/preload.js";

describe("buildRegionTree (RegionDataBuilderTest)", () => {
  let supplier: PreloadSupplier;

  beforeEach(() => {
    supplier = new PreloadSupplier(new FixtureDataSource(), new NullStorage());
  });

  async function load(regionCode: string): Promise<void> {
    const result = await supplier.loadRules(regionCode);
    expect(result.success).toBe(true);
  }

  it("builds a non-empty tree for US (BuildUsRegionTree)", async () => {
    await load("US");
    const { tree } = buildRegionTree(supplier, "US", "en-US");
    expect(tree.subRegions).not.toEqual([]);
  });

  it("builds a two-level tree for CN (BuildCnRegionTree)", async () => {
    await load("CN");
    const { tree } = buildRegionTree(supplier, "CN", "zh-Hans");
    expect(tree.subRegions.length).toBeGreaterThan(0);
    expect(tree.subRegions[0]!.subRegions.length).toBeGreaterThan(0);
  });

  // Live snapshot CH has no sub-region entries (depth 0). Unlike the fixture
  // which had data/CH/<canton> entries, the live service doesn't include
  // canton data for Switzerland. This matches upstream's expectation of an
  // empty tree (production's GetMaxLookupKeyDepth("CH") is 0).
  it("builds an empty tree for CH, which has no sub-region data in live snapshot (BuildChRegionTree, adjusted)", async () => {
    await load("CH");
    const { tree } = buildRegionTree(supplier, "CH", "de-CH");
    expect(tree.subRegions).toEqual([]);
  });

  it("builds an empty tree for ZW, which has no sub-region data (BuildZwRegionTree)", async () => {
    await load("ZW");
    const { tree } = buildRegionTree(supplier, "ZW", "en-ZW");
    expect(tree.subRegions).toEqual([]);
  });

  it("gives US states abbreviated keys and full names (UsTreeHasStateAbbreviationsAndNames)", async () => {
    await load("US");
    const { tree, bestLanguageTag } = buildRegionTree(supplier, "US", "en-US");
    expect(bestLanguageTag).toBe("en");
    expect(tree.subRegions[0]!.key).toBe("AL");
    expect(tree.subRegions[0]!.name).toBe("Alabama");
  });

  it("uses Korean keys with Latin-script names for ko-Latn (KrWithKoLatnLanguageHasKoreanKeysAndLatinScriptNames)", async () => {
    await load("KR");
    const { tree, bestLanguageTag } = buildRegionTree(supplier, "KR", "ko-Latn");
    expect(bestLanguageTag).toBe("ko-Latn");
    expect(tree.subRegions[0]!.key).toBe("강원도");
    expect(tree.subRegions[0]!.name).toBe("Gangwon");
  });

  it("uses Korean keys and names for ko-KR (KrWithKoKrLanguageHasKoreanKeysAndNames)", async () => {
    await load("KR");
    const { tree, bestLanguageTag } = buildRegionTree(supplier, "KR", "ko-KR");
    expect(bestLanguageTag).toBe("ko");
    expect(tree.subRegions[0]!.key).toBe("강원도");
    expect(tree.subRegions[0]!.name).toBe("강원");
  });
});
