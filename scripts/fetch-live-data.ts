#!/usr/bin/env node
// Downloads live address metadata from Google's aggregate endpoint and saves a
// snapshot as committed, reviewable JSON data.
//
// Usage: node --experimental-strip-types scripts/fetch-live-data.ts
//
// This snapshot replaces the outdated testdata/countryinfo.txt fixture as the
// source for the bundled offline dataset (packages/core/src/data/fallback.ts).
// Tests that verify against upstream's fixture keep using countryinfo.txt explicitly.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = `${ROOT}/data/live-snapshot.json`;

// Google's canonical aggregate endpoint for address metadata
const BASE_URL =
  "https://chromium-i18n.appspot.com/ssl-aggregate-address/data/";

// Concurrency limit: polite rate limiting
const MAX_CONCURRENT_REQUESTS = 4;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 1000;

interface SnapshotMetadata {
  sourceBaseUrl: string;
  fetchedAt: string; // ISO 8601 UTC
  regionCount: number;
  dataEntryCount: number;
}

interface LiveSnapshot {
  metadata: SnapshotMetadata;
  data: Record<string, Record<string, unknown>>;
}

// ISO 3166-1 alpha-2 region codes (all codes Google's endpoint serves),
// plus "ZZ" (the default rule used when a region has no specific rule).
const REGION_CODES = [
  "ZZ", // Default rule
  "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS",
  "AT", "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH",
  "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW",
  "BY", "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM",
  "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK",
  "DM", "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ",
  "FK", "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI",
  "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK",
  "HM", "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ",
  "IR", "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM",
  "KN", "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR",
  "LS", "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH",
  "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV",
  "MW", "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO",
  "NP", "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL",
  "PM", "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU",
  "RW", "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL",
  "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD",
  "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV",
  "TW", "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG",
  "VI", "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(url: string, maxRetries = MAX_RETRIES): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
      if (!response.ok) {
        if (response.status === 404) return null; // Region has no data
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (err) {
      if (attempt < maxRetries) {
        const backoffMs = RETRY_BACKOFF_MS * Math.pow(2, attempt);
        console.log(
          `  Retry ${attempt + 1}/${maxRetries} for ${url} after ${backoffMs}ms (${String(err)})`,
        );
        await new Promise((r) => setTimeout(r, backoffMs));
      } else {
        throw err;
      }
    }
  }
  return null;
}

// Simple semaphore for bounded concurrency
class Semaphore {
  private permits: number;
  private waitQueue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire() {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release() {
    this.permits++;
    const waiter = this.waitQueue.shift();
    if (waiter) {
      this.permits--;
      waiter();
    }
  }
}

async function main(): Promise<void> {
  console.log("Fetching live address metadata from Google's endpoint...");
  console.log(`Base URL: ${BASE_URL}`);

  const data: Record<string, Record<string, unknown>> = {};
  const semaphore = new Semaphore(MAX_CONCURRENT_REQUESTS);
  const errors: Array<{ region: string; error: string }> = [];

  // Fetch country-level data for all regions in parallel (bounded concurrency)
  const tasks = REGION_CODES.map(async (cc) => {
    await semaphore.acquire();
    try {
      const url = `${BASE_URL}${cc}`;
      console.log(`Fetching ${cc}...`);
      const json = await fetchWithRetry(url);
      if (!json) {
        console.log(`  ${cc}: no data (404 or empty)`);
        return;
      }

      const parsed = JSON.parse(json) as Record<string, unknown>;
      data[`data/${cc}`] = parsed;

      // Collect sub-keys at all depths by recursively checking the response
      // The aggregate endpoint returns the entire tree in one request
      for (const [key, value] of Object.entries(parsed)) {
        if (key.startsWith("data/") && key !== `data/${cc}`) {
          // This is a sub-region entry; extract it
          data[key] = value as Record<string, unknown>;
        }
      }

      console.log(`  ${cc}: OK (${Object.keys(parsed).length} entries in aggregate)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ region: cc, error: message });
      console.error(`  ${cc}: FAILED — ${message}`);
    } finally {
      semaphore.release();
    }
  });

  await Promise.all(tasks);

  if (errors.length > 0) {
    console.error(`\nFailed regions (${errors.length}):`);
    for (const { region, error } of errors) {
      console.error(`  ${region}: ${error}`);
    }
    throw new Error("Snapshot failed: some regions could not be fetched");
  }

  // Count unique region codes (top-level "data/CC" entries)
  const regionCodes = Object.keys(data)
    .filter((k) => /^data\/[A-Z]{2}$/.test(k))
    .length;

  const snapshot: LiveSnapshot = {
    metadata: {
      sourceBaseUrl: BASE_URL,
      fetchedAt: new Date().toISOString(),
      regionCount: regionCodes,
      dataEntryCount: Object.keys(data).length,
    },
    data,
  };

  // Write with readable formatting (one top-level entry per line for git diffs)
  const lines: string[] = [
    "{",
    '  "metadata": {',
    `    "sourceBaseUrl": "${snapshot.metadata.sourceBaseUrl}",`,
    `    "fetchedAt": "${snapshot.metadata.fetchedAt}",`,
    `    "regionCount": ${snapshot.metadata.regionCount},`,
    `    "dataEntryCount": ${snapshot.metadata.dataEntryCount}`,
    "  },",
    '  "data": {',
  ];

  const sortedDataKeys = Object.keys(snapshot.data).sort();
  for (let i = 0; i < sortedDataKeys.length; i++) {
    const key = sortedDataKeys[i];
    const value = snapshot.data[key];
    const isLast = i === sortedDataKeys.length - 1;
    lines.push(
      `    ${JSON.stringify(key)}: ${JSON.stringify(value)}${isLast ? "" : ","}`,
    );
  }

  lines.push("  }");
  lines.push("}");

  writeFileSync(OUT, lines.join("\n"), "utf8");

  console.log(`\nSnapshot saved to ${OUT}`);
  console.log(`  Regions: ${snapshot.metadata.regionCount}`);
  console.log(`  Total entries: ${snapshot.metadata.dataEntryCount}`);
  console.log(`  Fetched at: ${snapshot.metadata.fetchedAt}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
