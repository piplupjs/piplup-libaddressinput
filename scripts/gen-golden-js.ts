#!/usr/bin/env node
// Runs this library against test/golden/corpus.json and writes
// test/golden/js-output.json: one formatter/validator/layout result per
// corpus entry. This is the JS half of the golden cross-check described in
// .planning/PLAN.md Phase 8 — see test/golden/README.md for the C++ half
// (test/golden/cpp-harness/), which now actually runs too.
//
// Two suppliers are used: `supplier` (live FetchSource, against the real
// chromium-i18n.appspot.com endpoint) for `formatted`/`problems` — a
// realistic "what a consumer actually gets" snapshot — and
// `offlineSupplier` (the same bundled testdata/countryinfo.txt data the C++
// harness reads, via FallbackAggregateSource) for `formattedRaw`/
// `problemsOffline`, which is what cpp-harness/compare.cjs diffs against
// cpp-output.json — deterministic and reproducible without network access,
// and a true apples-to-apples comparison since both sides read identical
// input data.
//
// Usage: node --experimental-strip-types scripts/gen-golden-js.ts

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  FetchSource,
  MemoryStorage,
  NullStorage,
  PreloadSupplier,
  formatAddress,
  normalize,
  validate,
  buildLayout,
  type AddressData,
  type Source,
  type SourceResult,
  type ValidateOptions,
} from "../packages/core/dist/index.js";
import { FALLBACK_DATA } from "../packages/core/src/data/fallback.ts";

// Inlined rather than imported from packages/core/test/fake-sources.ts:
// that file uses a TS constructor parameter property, which
// `node --experimental-strip-types`'s strip-only mode (no real
// transformation, just type erasure) can't handle. See that file for the
// canonical version (used by the package's own test suite) — mirrors
// upstream's TestdataSource(/* aggregate= */ true): a request for
// "data/CC" returns every "data/CC[/<sub>]" entry as one JSON object, built
// from the same bundled testdata/countryinfo.txt-derived dataset the C++
// golden harness reads (see test/golden/README.md).
class FallbackAggregateSource implements Source {
  private readonly data: Record<string, string>;

  constructor(data: Record<string, string>) {
    this.data = data;
  }

  async get(key: string): Promise<SourceResult> {
    const aggregate: Record<string, unknown> = {};
    for (const [dataKey, json] of Object.entries(this.data)) {
      if (dataKey.startsWith(key)) {
        aggregate[dataKey] = JSON.parse(json);
      }
    }
    const hasAny = Object.keys(aggregate).length > 0;
    return { success: true, data: hasAny ? JSON.stringify(aggregate) : "{}" };
  }
}

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const CORPUS_PATH = `${ROOT}/test/golden/corpus.json`;
const OUTPUT_PATH = `${ROOT}/test/golden/js-output.json`;

interface CorpusEntry {
  address: AddressData;
  validateOptions?: ValidateOptions;
}

async function main(): Promise<void> {
  const corpus = JSON.parse(readFileSync(CORPUS_PATH, "utf8")) as CorpusEntry[];
  const supplier = new PreloadSupplier(new FetchSource(), new MemoryStorage());
  const offlineSupplier = new PreloadSupplier(
    new FallbackAggregateSource(FALLBACK_DATA as Record<string, string>),
    new NullStorage(),
  );

  const results = [];
  for (const entry of corpus) {
    const { address, validateOptions } = entry;
    const regionCode = address.regionCode;

    let normalized = address;
    let formatted: string[] | undefined;
    let problems: unknown;
    let loadError: string | undefined;

    // formatAddress() never itself normalizes (matches upstream:
    // GetFormattedNationalAddress doesn't call AddressNormalizer) — this is
    // the address exactly as given. `formatted` (below) is post-
    // normalization, the more realistic "what a consumer following the
    // README's quick start actually gets" value.
    const formattedRaw = formatAddress(address);

    if (regionCode.length > 0) {
      await offlineSupplier.loadRules(regionCode);
    }
    const problemsOffline = await validate(offlineSupplier, address, validateOptions);

    if (regionCode.length > 0) {
      const loaded = await supplier.loadRules(regionCode);
      if (loaded.success) {
        normalized = normalize(supplier, address);
        formatted = formatAddress(normalized);
        problems = await validate(supplier, address, validateOptions);
      } else {
        loadError = `failed to load region data for "${regionCode}"`;
      }
    } else {
      formatted = formattedRaw;
      problems = problemsOffline;
    }

    const layout = regionCode.length > 0 ? buildLayout(regionCode, "en") : undefined;

    results.push({
      input: entry,
      normalized,
      formattedRaw,
      formatted,
      problemsOffline,
      problems,
      layout,
      loadError,
    });
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), "utf8");
  console.log(`Wrote ${OUTPUT_PATH}: ${results.length} corpus entries.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
