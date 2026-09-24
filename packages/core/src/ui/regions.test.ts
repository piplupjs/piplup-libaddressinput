import { describe, expect, it } from "vitest";
import { getRegionOptions, formatRegionOption, findSubRegions } from "./regions.js";
import type { RegionData } from "../region-data.js";

describe("ui/regions", () => {
  it("returns region options with codes and friendly names", () => {
    const options = getRegionOptions("en");
    expect(options.length).toBeGreaterThan(200);

    const us = options.find((o) => o.code === "US");
    expect(us).toBeDefined();
    expect(us?.name).toBe("United States");

    const inOption = options.find((o) => o.code === "IN");
    expect(inOption).toBeDefined();
    expect(inOption?.name).toBe("India");
  });

  it("formats subregion option labels cleanly", () => {
    // When name and key differ:
    expect(formatRegionOption({ key: "CA", name: "California" })).toBe("California (CA)");

    // When name and key are identical (like Indian states):
    expect(formatRegionOption({ key: "Uttar Pradesh", name: "Uttar Pradesh" })).toBe(
      "Uttar Pradesh",
    );

    // When name is absent:
    expect(formatRegionOption({ key: "CA" })).toBe("CA");
  });

  it("navigates RegionData tree with findSubRegions", () => {
    const mockTree: RegionData = {
      key: "US",
      name: "United States",
      subRegions: [
        {
          key: "CA",
          name: "California",
          subRegions: [
            { key: "Mountain View", name: "Mountain View", subRegions: [] },
            { key: "Sunnyvale", name: "Sunnyvale", subRegions: [] },
          ],
        },
        {
          key: "NY",
          name: "New York",
          subRegions: [],
        },
      ],
    };

    expect(findSubRegions(null, "CA")).toEqual([]);
    expect(findSubRegions(mockTree, undefined)).toEqual([]);
    expect(findSubRegions(mockTree, "")).toEqual([]);

    // Find by key:
    const caSubRegions = findSubRegions(mockTree, "CA");
    expect(caSubRegions).toHaveLength(2);
    expect(caSubRegions[0]?.name).toBe("Mountain View");

    // Find by name:
    const caByName = findSubRegions(mockTree, "California");
    expect(caByName).toHaveLength(2);

    // Non-existent key:
    expect(findSubRegions(mockTree, "TX")).toEqual([]);
  });
});
