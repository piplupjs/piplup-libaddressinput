// Test fixture source that serves data from upstream's testdata/countryinfo.txt.
// This is used by tests that verify against upstream's own fixture data,
// keeping them independent of the bundled live-snapshot data.
//
// Port of upstream's testdata_source.cc, adapted to TypeScript.
// Supports both aggregate mode (returns all matching entries) and non-aggregate mode (single entry).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { Source, SourceResult } from "../src/source.js";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const FIXTURE_PATH = resolve(
  ROOT,
  "third_party/libaddressinput/testdata/countryinfo.txt",
);

interface FixtureEntry {
  key: string;
  json: Record<string, unknown>;
}

class FixtureDataSource implements Source {
  private static cache: Map<string, FixtureEntry> | null = null;
  private readonly aggregate: boolean;

  constructor(aggregate: boolean = true) {
    this.aggregate = aggregate;
  }

  private static loadFixture(): Map<string, FixtureEntry> {
    if (FixtureDataSource.cache !== null) {
      return FixtureDataSource.cache;
    }

    const cache = new Map<string, FixtureEntry>();
    const text = readFileSync(FIXTURE_PATH, "utf8");

    for (const rawLine of text.split("\n")) {
      const line = rawLine.trim();
      if (line.length === 0) continue;

      const eq = line.indexOf("=");
      if (eq === -1) continue;

      const key = line.slice(0, eq);

      // Only address-data entries (data/* keys) are relevant
      if (!key.startsWith("data/")) continue;

      const rawJson = line.slice(eq + 1);
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawJson);
      } catch (err) {
        throw new Error(
          `FixtureDataSource: failed to parse JSON for ${key}: ${String(err)}`,
        );
      }

      cache.set(key, { key, json: parsed });
    }

    FixtureDataSource.cache = cache;
    return cache;
  }

  async get(key: string): Promise<SourceResult> {
    const entries = FixtureDataSource.loadFixture();

    if (this.aggregate) {
      // Aggregate mode: return the requested entry plus all sub-entries
      // (e.g., "data/US" returns data/US and all data/US/* entries)
      const aggregate: Record<string, unknown> = {};
      for (const [entryKey, entry] of entries) {
        if (entryKey === key || entryKey.startsWith(key + "/")) {
          aggregate[entryKey] = entry.json;
        }
      }
      const data =
        Object.keys(aggregate).length > 0
          ? JSON.stringify(aggregate)
          : "{}";
      return { success: true, data };
    } else {
      // Non-aggregate mode: return just the single entry
      const entry = entries.get(key);
      const data = entry ? JSON.stringify(entry.json) : "{}";
      return { success: true, data };
    }
  }
}

export { FixtureDataSource };
