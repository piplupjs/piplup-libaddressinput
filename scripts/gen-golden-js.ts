#!/usr/bin/env node
// Runs this library against test/golden/corpus.json and writes
// test/golden/js-output.json: one formatter/validator/layout result per
// corpus entry. This is the JS half of the golden cross-check described in
// .planning/PLAN.md Phase 8 — the C++ half (running the same corpus through
// upstream's own build and diffing) is scaffolded in test/golden/README.md
// but wasn't runnable in the environment this was written in (no C++
// toolchain — see that README). This script stands on its own regardless:
// it's a real snapshot of this library's behavior across many regions,
// useful for catching accidental regressions even without a C++ comparison.
//
// Usage: node --experimental-strip-types scripts/gen-golden-js.ts

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  FetchSource,
  MemoryStorage,
  PreloadSupplier,
  formatAddress,
  normalize,
  validate,
  buildLayout,
  type AddressData,
  type ValidateOptions,
} from "../packages/core/dist/index.js";

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

  const results = [];
  for (const entry of corpus) {
    const { address, validateOptions } = entry;
    const regionCode = address.regionCode;

    let normalized = address;
    let formatted: string[] | undefined;
    let problems: unknown;
    let loadError: string | undefined;

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
      formatted = formatAddress(address);
      problems = await validate(supplier, address, validateOptions);
    }

    const layout = regionCode.length > 0 ? buildLayout(regionCode, "en") : undefined;

    results.push({
      input: entry,
      normalized,
      formatted,
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
