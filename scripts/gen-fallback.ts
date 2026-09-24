#!/usr/bin/env node
// Generates packages/core/src/data/fallback.ts from the live address metadata
// snapshot at data/live-snapshot.json.
//
// The snapshot is downloaded from Google's aggregate endpoint
// (https://chromium-i18n.appspot.com/ssl-aggregate-address/data/) by
// scripts/fetch-live-data.ts and contains the current, authoritative address
// metadata for all regions. This replaces the outdated testdata/countryinfo.txt
// fixture from upstream's OSS repo (which Google uses for their own tests but
// which is not updated as frequently as the live service).
//
// Usage: node --experimental-strip-types scripts/gen-fallback.ts

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = `${ROOT}/data/live-snapshot.json`;
const OUT = `${ROOT}/packages/core/src/data/fallback.ts`;

interface Entry {
  key: string; // e.g. "data/US" or "data/US/CA"
  json: string; // the raw JSON object text, re-serialized compactly
}

interface LiveSnapshot {
  metadata: {
    sourceBaseUrl: string;
    fetchedAt: string;
    regionCount: number;
    dataEntryCount: number;
  };
  data: Record<string, Record<string, unknown>>;
}

function parseLiveSnapshot(text: string): Map<string, Entry> {
  const snapshot = JSON.parse(text) as LiveSnapshot;
  const entries = new Map<string, Entry>();

  // Each key in snapshot.data maps to an aggregate response (e.g., "data/CA" -> {data/CA: {...}, data/CA/ON: {...}, ...})
  // Extract all individual entries from the aggregate responses
  for (const [aggregateKey, aggregateResponse] of Object.entries(snapshot.data)) {
    if (!aggregateKey.startsWith("data/")) continue;

    // The aggregate response is an object where each key is an individual entry
    // (e.g., {"data/CA": {...}, "data/CA/ON": {...}, ...})
    if (typeof aggregateResponse === "object" && aggregateResponse !== null) {
      for (const [entryKey, entryValue] of Object.entries(
        aggregateResponse as Record<string, unknown>,
      )) {
        if (entryKey.startsWith("data/")) {
          entries.set(entryKey, { key: entryKey, json: JSON.stringify(entryValue) });
        }
      }
    }
  }

  return entries;
}

function computeMaxDepth(entries: Map<string, Entry>, regionCode: string): number {
  let maxDepth = 0;
  const prefix = `data/${regionCode}/`;
  for (const key of entries.keys()) {
    if (key === `data/${regionCode}` || !key.startsWith(prefix)) continue;
    // "data/US/CA" -> 1 extra segment -> depth 1; "data/CN/xx/yy/zz" -> depth 3.
    const depth = key.slice(prefix.length).split("/").length;
    if (depth > maxDepth) maxDepth = depth;
  }
  return maxDepth;
}

function main(): void {
  const sourceText = readFileSync(SOURCE, "utf8");
  const entries = parseLiveSnapshot(sourceText);

  const regionCodes = [...entries.keys()]
    .filter((key) => /^data\/[A-Z]{2}$/.test(key) && key !== "data/ZZ")
    .map((key) => key.slice("data/".length))
    .sort();

  const defaultEntry = entries.get("data/ZZ");
  if (!defaultEntry) {
    throw new Error("gen-fallback: data/ZZ (default rule) not found in source data");
  }

  const dataEntries = [...entries.entries()]
    .filter(([key]) => key !== "data/ZZ")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  const maxDepths: Record<string, number> = {};
  for (const code of regionCodes) {
    const depth = computeMaxDepth(entries, code);
    if (depth > 0) maxDepths[code] = depth;
  }

  const snapshot = JSON.parse(sourceText) as LiveSnapshot;
  const lines: string[] = [];
  lines.push(
    "// GENERATED FILE — do not edit by hand.",
    "// Produced by scripts/gen-fallback.ts from data/live-snapshot.json,",
    "// a snapshot of Google's live address-metadata service",
    `// (source: ${snapshot.metadata.sourceBaseUrl})`,
    `// fetched at: ${snapshot.metadata.fetchedAt}`,
    "// See .planning/PLAN.md Phase 8 and DIVERGENCES.md for context.",
    "//",
    "// Regenerate with:",
    "//   node --experimental-strip-types scripts/fetch-live-data.ts",
    "//   node --experimental-strip-types scripts/gen-fallback.ts",
    "",
    "/** Every supported region code, sorted (matches RegionCodesSorted upstream). */",
    `export const FALLBACK_REGION_CODES: readonly string[] = ${JSON.stringify(regionCodes)};`,
    "",
    "/**",
    ' * Raw JSON text for every "data/<CC>" and "data/<CC>/<sub...>" rule,',
    " * keyed exactly as upstream's LookupKey.ToKeyString() would produce",
    " * (no language suffix). Values are left as JSON strings (not parsed",
    " * objects) so callers can feed them straight to internal/rule.ts's",
    " * parseRule(), matching upstream's Rule::ParseSerializedRule(string).",
    " */",
    "export const FALLBACK_DATA: Readonly<Record<string, string>> = {",
    ...dataEntries.map(
      ([key, entry]) => `  ${JSON.stringify(key)}: ${JSON.stringify(entry.json)},`,
    ),
    "};",
    "",
    '/** The "ZZ" default rule (data/ZZ), used when a region has no data of its own. */',
    `export const FALLBACK_DEFAULT_REGION_DATA: string = ${JSON.stringify(defaultEntry.json)};`,
    "",
    "/**",
    " * How many levels deep (0 = country only, 3 = country/admin/locality/",
    " * dependent-locality) each region's data goes, computed from the deepest",
    ' * "data/<CC>/..." key present. Regions with no sub-region data at all',
    " * (depth 0) are omitted; look up with `FALLBACK_MAX_LOOKUP_KEY_DEPTH[cc] ?? 0`.",
    " */",
    `export const FALLBACK_MAX_LOOKUP_KEY_DEPTH: Readonly<Record<string, number>> = ${JSON.stringify(maxDepths)};`,
    "",
  );

  writeFileSync(OUT, lines.join("\n"), "utf8");
  console.log(
    `Wrote ${OUT}: ${regionCodes.length} regions, ${dataEntries.length} rule entries.`,
  );
}

main();
