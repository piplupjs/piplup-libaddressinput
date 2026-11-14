// Port of cpp/include/libaddressinput/storage.h (+ null_storage.h)
// (Apache-2.0, Google Inc.), reshaped as a Promise-based interface instead
// of a callback one (see .planning/PLAN.md §3, design decision 3).

export interface StorageResult {
  data: string | undefined;
  success: boolean;
}

/**
 * Stores address metadata (e.g. on disk, in `localStorage`, in a database).
 * Implementations are injected by the consumer — see FetchSource for the
 * network-side equivalent.
 */
export interface Storage {
  get(key: string): Promise<StorageResult>;
  put(key: string, data: string): Promise<void> | void;
}

/** In-memory Storage. The default; also doubles as the fake used in tests. */
export class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  put(key: string, data: string): void {
    this.data.set(key, data);
  }

  async get(key: string): Promise<StorageResult> {
    const data = this.data.get(key);
    return { data, success: data !== undefined };
  }
}

/** Port of null_storage.h: a Storage that never has anything. */
export class NullStorage implements Storage {
  put(_key: string, _data: string): void {
    // Discarded, matching upstream's NullStorage::Put.
  }

  async get(_key: string): Promise<StorageResult> {
    return { data: undefined, success: false };
  }
}
