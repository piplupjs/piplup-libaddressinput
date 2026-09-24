// Regression tests for the bundled live-snapshot data (packages/core/src/data/fallback.ts).
// These tests verify that the bundled dataset meets known data requirements, preventing
// regressions when updating the snapshot.

import { describe, expect, it } from "vitest";
import {
  FALLBACK_DATA,
  FALLBACK_REGION_CODES,
  FALLBACK_DEFAULT_REGION_DATA,
  FALLBACK_MAX_LOOKUP_KEY_DEPTH,
} from "./data/fallback.js";
import { parseRule } from "./internal/rule.js";

describe("Bundled live-snapshot data (FALLBACK_DATA)", () => {
  it("includes all expected region codes", () => {
    // Should have 250 regions (excluding ZZ which is default, not a region)
    expect(FALLBACK_REGION_CODES.length).toBeGreaterThan(200);
    expect(FALLBACK_REGION_CODES).toContain("US");
    expect(FALLBACK_REGION_CODES).toContain("IN");
    expect(FALLBACK_REGION_CODES).toContain("CN");
    expect(FALLBACK_REGION_CODES).toContain("KR");
  });

  it("has the ZZ default rule", () => {
    expect(FALLBACK_DEFAULT_REGION_DATA).toBeTruthy();
    const rule = parseRule(FALLBACK_DEFAULT_REGION_DATA);
    expect(rule).toBeDefined();
  });

  it("India (IN) has multiple subdivisions from live data", () => {
    // Get all India sub-region entries
    const inSubEntries = Object.keys(FALLBACK_DATA).filter((k) =>
      k.startsWith("data/IN/"),
    );

    // Should have substantial number of states (live data has 36)
    expect(inSubEntries.length).toBeGreaterThanOrEqual(30);

    // Verify live snapshot has more detailed India data than the old fixture
    // This is a regression test to ensure we're using live data, not the outdated fixture
  });

  it("China (CN) and Korea (KR) have multi-level data", () => {
    // CN should have depth 2 or 3 (city/province levels)
    const cnDepth = FALLBACK_MAX_LOOKUP_KEY_DEPTH["CN"];
    expect(cnDepth).toBeGreaterThanOrEqual(2);

    // KR should have depth 2 (city/province levels)
    const krDepth = FALLBACK_MAX_LOOKUP_KEY_DEPTH["KR"];
    expect(krDepth).toBeGreaterThanOrEqual(2);

    // Both should have sub-region entries in the data (at least one level deep)
    const cnSubEntries = Object.keys(FALLBACK_DATA).filter((k) =>
      k.startsWith("data/CN/"),
    );
    expect(cnSubEntries.length).toBeGreaterThan(0);

    const krSubEntries = Object.keys(FALLBACK_DATA).filter((k) =>
      k.startsWith("data/KR/"),
    );
    expect(krSubEntries.length).toBeGreaterThan(0);
  });

  it("United States (US) has 50+ sub-regions", () => {
    // US should have depth 1 (state-level at minimum)
    const usDepth = FALLBACK_MAX_LOOKUP_KEY_DEPTH["US"];
    expect(usDepth).toBeGreaterThanOrEqual(1);

    // US should have many sub-region entries (states, territories, etc.)
    const usSubEntries = Object.keys(FALLBACK_DATA).filter((k) =>
      k.startsWith("data/US/"),
    );
    expect(usSubEntries.length).toBeGreaterThanOrEqual(50);

    // Check for some known state codes in the sub-entries
    const stateCodesInData = usSubEntries
      .map((k) => k.slice("data/US/".length))
      .filter((k) => !k.includes("/"));
    expect(stateCodesInData).toContain("AL"); // Alabama
    expect(stateCodesInData).toContain("CA"); // California
    expect(stateCodesInData).toContain("NY"); // New York
  });

  it("all region rules are parseable", () => {
    const parseErrors: string[] = [];

    for (const [key, data] of Object.entries(FALLBACK_DATA)) {
      const json = typeof data === "string" ? data : JSON.stringify(data);
      const rule = parseRule(json);
      if (!rule) {
        parseErrors.push(`${key}: failed to parse rule`);
      }
    }

    expect(parseErrors).toEqual([]);
  });

  it("sub_keys, sub_isoids, and sub_names arrays have consistent lengths when present", () => {
    const lengthMismatches: string[] = [];

    for (const [key, data] of Object.entries(FALLBACK_DATA)) {
      const json = typeof data === "string" ? JSON.parse(data) : data;

      const subKeysStr = json.sub_keys as string | undefined;
      const subIsoidsStr = json.sub_isoids as string | undefined;
      const subNamesStr = json.sub_names as string | undefined;

      const subKeysLen = subKeysStr ? subKeysStr.split("~").length : 0;
      const subIsoidsLen = subIsoidsStr ? subIsoidsStr.split("~").length : 0;
      const subNamesLen = subNamesStr ? subNamesStr.split("~").length : 0;

      // If sub_keys exist, they define the expected length
      // If sub_isoids exist (non-zero), they must match sub_keys length
      // If sub_names exist (non-zero), they must match sub_keys length
      if (subKeysLen > 0) {
        if (subIsoidsLen > 0 && subIsoidsLen !== subKeysLen) {
          lengthMismatches.push(
            `${key}: sub_keys=${subKeysLen}, sub_isoids=${subIsoidsLen} (mismatch)`,
          );
        }
        if (subNamesLen > 0 && subNamesLen !== subKeysLen) {
          lengthMismatches.push(
            `${key}: sub_keys=${subKeysLen}, sub_names=${subNamesLen} (mismatch)`,
          );
        }
      }
    }

    expect(lengthMismatches).toEqual([]);
  });

  it("data entry count is reasonable", () => {
    const entryCount = Object.keys(FALLBACK_DATA).length;
    // Should have > 12000 entries (including default rule in live snapshot)
    expect(entryCount).toBeGreaterThan(12000);
  });
});
