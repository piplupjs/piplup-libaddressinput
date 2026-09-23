// Port of cpp/src/validating_storage.h / .cc + validating_util.h / .cc
// (Apache-2.0, Google Inc.), with one deliberate divergence: no MD5
// checksum (see .planning/PLAN.md §3, design decision 5). Upstream wraps
// stored data with both a timestamp and an MD5 checksum, the latter to
// guard against on-disk corruption from something else touching the file.
// A pluggable, often non-file-backed Storage (localStorage, IndexedDB, a
// database) doesn't get corrupted the same way flat files can, and adding
// MD5 would be the one place this zero-dependency library needs a hash
// implementation — not worth it for that guard alone. The staleness
// (30-day TTL) behavior is preserved exactly.

import type { Storage, StorageResult } from "../storage.js";

const TIMESTAMP_PREFIX = "timestamp=";
const SEPARATOR = "\n";

// 30 days, matching upstream's "one month" (30 * 24 * 60 * 60 seconds).
const STALENESS_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

function wrap(timestampMs: number, data: string): string {
  return `${TIMESTAMP_PREFIX}${timestampMs}${SEPARATOR}${data}`;
}

// Returns the unwrapped data if the timestamp is present, well-formed, and
// recent with respect to `nowMs`; otherwise undefined. Mirrors
// ValidatingUtil::UnwrapTimestamp, minus the checksum step.
function unwrap(wrapped: string, nowMs: number): string | undefined {
  if (!wrapped.startsWith(TIMESTAMP_PREFIX)) {
    return undefined;
  }
  const separatorIndex = wrapped.indexOf(SEPARATOR, TIMESTAMP_PREFIX.length);
  if (separatorIndex === -1) {
    return undefined;
  }
  const timestampString = wrapped.slice(TIMESTAMP_PREFIX.length, separatorIndex);
  const timestampMs = Number(timestampString);
  if (!Number.isFinite(timestampMs) || timestampMs < 0) {
    return undefined;
  }
  const data = wrapped.slice(separatorIndex + 1);
  const ageMs = nowMs - timestampMs;
  const isFresh = ageMs >= 0 && ageMs < STALENESS_THRESHOLD_MS;
  return isFresh ? data : undefined;
}

// Same as unwrap(), but also returns stale (out-of-window) data instead of
// discarding it — used for the Retriever's one-time stale-data fallback.
// Returns undefined only when the wrapper itself is missing/malformed.
function unwrapAllowingStale(
  wrapped: string,
  nowMs: number,
): { data: string; isStale: boolean } | undefined {
  if (!wrapped.startsWith(TIMESTAMP_PREFIX)) {
    return undefined;
  }
  const separatorIndex = wrapped.indexOf(SEPARATOR, TIMESTAMP_PREFIX.length);
  if (separatorIndex === -1) {
    return undefined;
  }
  const timestampString = wrapped.slice(TIMESTAMP_PREFIX.length, separatorIndex);
  const timestampMs = Number(timestampString);
  if (!Number.isFinite(timestampMs) || timestampMs < 0) {
    return undefined;
  }
  const data = wrapped.slice(separatorIndex + 1);
  const ageMs = nowMs - timestampMs;
  const isStale = !(ageMs >= 0 && ageMs < STALENESS_THRESHOLD_MS);
  return { data, isStale };
}

export interface ValidatingStorageOptions {
  /** Injectable clock, for tests. Defaults to `Date.now`. */
  now?: () => number;
}

/**
 * Wraps a Storage with a timestamp so stale entries are reported as misses
 * (`success: false`) while still handing back their data, letting callers
 * (see internal/retriever.ts) use it as a last-resort fallback.
 */
export class ValidatingStorage {
  private readonly wrapped: Storage;
  private readonly now: () => number;

  constructor(wrapped: Storage, options: ValidatingStorageOptions = {}) {
    this.wrapped = wrapped;
    this.now = options.now ?? Date.now;
  }

  async put(key: string, data: string): Promise<void> {
    await this.wrapped.put(key, wrap(this.now(), data));
  }

  /**
   * Returns `{ success: true, data }` for fresh data, or
   * `{ success: false, data }` for stale-but-well-formed data (`data` may
   * still be defined in that case — see the class doc), or
   * `{ success: false, data: undefined }` for a miss or corrupt/malformed
   * entry.
   */
  async get(key: string): Promise<StorageResult> {
    const result = await this.wrapped.get(key);
    if (!result.success || result.data === undefined) {
      return { success: false, data: undefined };
    }
    const unwrapped = unwrapAllowingStale(result.data, this.now());
    if (unwrapped === undefined) {
      // Malformed entry: treat like upstream's "corrupted" case.
      return { success: false, data: undefined };
    }
    return { success: !unwrapped.isStale, data: unwrapped.data };
  }
}

// Exported for tests only.
export const __internal = { wrap, unwrap, STALENESS_THRESHOLD_MS };
