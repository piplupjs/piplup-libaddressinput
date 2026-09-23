// Port of cpp/src/retriever.h / retriever.cc (Apache-2.0, Google Inc.).
//
// Checks storage first; on a miss or stale entry, fetches from the source
// and (on success) writes back to storage. If the source fails, falls back
// to stale data from storage one time rather than surfacing an error.

import type { Source } from "../source.js";
import type { Storage } from "../storage.js";
import { ValidatingStorage, type ValidatingStorageOptions } from "./validating-storage.js";

export interface RetrieverResult {
  success: boolean;
  key: string;
  data: string;
}

export class Retriever {
  private readonly source: Source;
  private readonly storage: ValidatingStorage;

  constructor(source: Source, storage: Storage, options?: ValidatingStorageOptions) {
    this.source = source;
    this.storage = new ValidatingStorage(storage, options);
  }

  async retrieve(key: string): Promise<RetrieverResult> {
    const validated = await this.storage.get(key);
    if (validated.success) {
      // validated.data is defined whenever success is true (see
      // ValidatingStorage.get's contract).
      return { success: true, key, data: validated.data! };
    }

    // ValidatingStorage reports (false, stale-data) for valid-but-stale
    // entries, and (false, undefined) for a miss or a corrupt entry.
    const staleData =
      validated.data !== undefined && validated.data.length > 0
        ? validated.data
        : undefined;

    const fresh = await this.source.get(key);
    if (fresh.success && fresh.data !== undefined) {
      await this.storage.put(key, fresh.data);
      return { success: true, key, data: fresh.data };
    }
    if (staleData !== undefined) {
      // Reuse the stale data if a download fails. It's better to have
      // slightly outdated validation rules than to suddenly lose validation
      // ability (matches upstream's comment verbatim).
      return { success: true, key, data: staleData };
    }
    return { success: false, key, data: "" };
  }
}
