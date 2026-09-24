// Port of cpp/include/libaddressinput/source.h (Apache-2.0, Google Inc.),
// reshaped as a Promise-based interface (see .planning/PLAN.md §3, design
// decision 3).

export interface SourceResult {
  success: boolean;
  data: string | undefined;
}

/**
 * Gets address metadata, typically over the network. Implementations are
 * injected by the consumer, which keeps this headless library from ever
 * touching a global `fetch`/`XMLHttpRequest` implicitly (see PLAN.md §1.6).
 */
export interface Source {
  get(key: string): Promise<SourceResult>;
}

export interface FetchSourceOptions {
  /**
   * The function used to make requests. Defaults to `globalThis.fetch` if
   * present, so this only needs to be passed in environments without a
   * global `fetch` (or to use a proxy/instrumented client).
   */
  fetch?: typeof globalThis.fetch;
  /**
   * Prefixed to `key` to form the request URL. Defaults to the public
   * aggregate address-metadata endpoint upstream's own tooling uses.
   */
  baseUrl?: string;
}

import { FALLBACK_DATA } from "./data/fallback.js";

const DEFAULT_BASE_URL =
  "https://www.gstatic.com/chrome/autofill/libaddressinput/chromium-i18n/ssl-aggregate-address/";
const LEGACY_BASE_URL =
  "https://chromium-i18n.appspot.com/ssl-aggregate-address/";

/**
 * A Source backed by `fetch`. Matches the real endpoint's documented
 * behavior (see testdata_source.cc in the vendored submodule): any request
 * for a key with no data still returns 200 with `"{}"`, so `success` here
 * tracks the HTTP response status, not "was there data for this key".
 *
 * Defaults to Google's canonical GStatic CDN endpoint (which avoids the 302
 * redirect and adblocker/CORS redirect issues associated with the legacy
 * chromium-i18n.appspot.com URL), with transparent fallback to the legacy URL.
 */
export class FetchSource implements Source {
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly baseUrl: string;

  constructor(options: FetchSourceOptions = {}) {
    const fetchImpl = options.fetch ?? globalThis.fetch;
    if (fetchImpl === undefined) {
      throw new Error(
        "FetchSource: no fetch implementation available; pass { fetch } explicitly",
      );
    }
    this.fetchImpl = fetchImpl;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async get(key: string): Promise<SourceResult> {
    try {
      const response = await this.fetchImpl(this.baseUrl + key);
      if (response.ok) {
        return { success: true, data: await response.text() };
      }
    } catch {
      // Primary fetch failed (network error, offline, CORS, adblocker, etc.)
    }

    // If using the default URL and it failed, try the legacy App Engine URL as fallback.
    // Vice versa if the caller explicitly configured the legacy App Engine URL.
    const fallbackUrl =
      this.baseUrl === DEFAULT_BASE_URL
        ? LEGACY_BASE_URL
        : this.baseUrl === LEGACY_BASE_URL
          ? DEFAULT_BASE_URL
          : undefined;

    if (fallbackUrl !== undefined) {
      try {
        const response = await this.fetchImpl(fallbackUrl + key);
        if (response.ok) {
          return { success: true, data: await response.text() };
        }
      } catch {
        // Fallback fetch also failed
      }
    }

    return { success: false, data: undefined };
  }
}

/**
 * A Source backed by the bundled offline dataset (parsed from upstream's
 * `countryinfo.txt`). Requires no network I/O; useful for offline environments,
 * testing, SSR, or as a fallback when `FetchSource` is unreachable.
 */
export class FallbackAggregateSource implements Source {
  async get(key: string): Promise<SourceResult> {
    const aggregate: Record<string, unknown> = {};
    for (const [dataKey, json] of Object.entries(FALLBACK_DATA)) {
      if (dataKey.startsWith(key)) {
        aggregate[dataKey] = JSON.parse(json);
      }
    }
    if (Object.keys(aggregate).length === 0) {
      return { success: true, data: "{}" };
    }
    return { success: true, data: JSON.stringify(aggregate) };
  }
}
