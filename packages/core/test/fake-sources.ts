// Test doubles used across Phase 2 tests. Not part of the published package.
//
// - FallbackDataSource mirrors upstream's TestdataSource(/* aggregate= */
//   false): looks a key up in the real bundled dataset and returns success
//   with "{}" for anything it doesn't have (matching the real endpoint's
//   documented behavior — see source.ts's FetchSource doc comment).
// - MapSource mirrors mock_source.h: a Source backed by a plain map, success
//   only for keys explicitly present (an empty one fails every request,
//   used to simulate "the network is down").

import { FALLBACK_DATA } from "../src/data/fallback.js";
import type { Source, SourceResult } from "../src/source.js";

export class FallbackDataSource implements Source {
  async get(key: string): Promise<SourceResult> {
    const data = FALLBACK_DATA[key];
    return { success: true, data: data ?? "{}" };
  }
}

export class MapSource implements Source {
  constructor(private readonly data: Record<string, string> = {}) {}

  async get(key: string): Promise<SourceResult> {
    const data = this.data[key];
    return { success: data !== undefined, data };
  }
}

/**
 * Mirrors upstream's TestdataSource(/* aggregate= *\/ true): a request for
 * "data/CC" returns a single JSON object mapping every "data/CC[/<sub>]" id
 * (at any depth) to its rule, built from the same bundled dataset.
 */
export class FallbackAggregateSource implements Source {
  async get(key: string): Promise<SourceResult> {
    const prefix = `${key}/`;
    const aggregate: Record<string, unknown> = {};
    const own = FALLBACK_DATA[key];
    if (own !== undefined) {
      aggregate[key] = JSON.parse(own);
    }
    for (const [dataKey, json] of Object.entries(FALLBACK_DATA)) {
      if (dataKey.startsWith(prefix)) {
        aggregate[dataKey] = JSON.parse(json);
      }
    }
    if (Object.keys(aggregate).length === 0) {
      return { success: true, data: "{}" };
    }
    return { success: true, data: JSON.stringify(aggregate) };
  }
}
