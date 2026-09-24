// Ported from cpp/test/retriever_test.cc (Apache-2.0, Google Inc.).
//
// Uses FallbackDataSource (built from the real bundled dataset) in place of
// upstream's TestdataSource, and MapSource in place of MockSource — see
// test/fake-sources.ts.

import { describe, expect, it } from "vitest";
import { FallbackDataSource, MapSource } from "../../test/fake-sources.js";
import {
  MemoryStorage,
  NullStorage,
  type Storage,
  type StorageResult,
} from "../storage.js";
import { Retriever } from "./retriever.js";

const KEY = "data/CA/AB--fr";
const EMPTY_DATA = "{}";

describe("Retriever (RetrieverTest)", () => {
  it("retrieves data (RetrieveData)", async () => {
    const retriever = new Retriever(new FallbackDataSource(), new NullStorage());
    const result = await retriever.retrieve(KEY);
    expect(result.success).toBe(true);
    expect(result.key).toBe(KEY);
    expect(result.data).not.toBe("");
    expect(result.data).not.toBe(EMPTY_DATA);
  });

  it("reads data from storage on a repeat request (ReadDataFromStorage)", async () => {
    const retriever = new Retriever(new FallbackDataSource(), new MemoryStorage());
    const first = await retriever.retrieve(KEY);
    const second = await retriever.retrieve(KEY);
    expect(second.success).toBe(true);
    expect(second.data).toBe(first.data);
  });

  it("returns empty data for a missing key (MissingKeyReturnsEmptyData)", async () => {
    const retriever = new Retriever(new FallbackDataSource(), new NullStorage());
    const result = await retriever.retrieve("junk");
    expect(result.success).toBe(true);
    expect(result.key).toBe("junk");
    expect(result.data).toBe(EMPTY_DATA);
  });

  it("fails when the source fails and there's no stale data (FaultySource)", async () => {
    // An empty MapSource fails every request, like upstream's empty MockSource.
    const retriever = new Retriever(new MapSource(), new NullStorage());
    const result = await retriever.retrieve(KEY);
    expect(result.success).toBe(false);
    expect(result.key).toBe(KEY);
    expect(result.data).toBe("");
  });

  it("uses stale data when the source fails (UseStaleDataWhenSourceFails)", async () => {
    let putCalled = false;
    const staleStorage: Storage = {
      async get(_key: string): Promise<StorageResult> {
        // A stale-but-well-formed entry: 2 months old.
        const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
        return { success: true, data: `timestamp=${twoMonthsAgo}\n{"foo":"bar"}` };
      },
      put(_key: string, _data: string): void {
        putCalled = true;
      },
    };
    const retriever = new Retriever(new MapSource(), staleStorage);
    const result = await retriever.retrieve(KEY);
    expect(result.success).toBe(true);
    expect(result.data).toBe('{"foo":"bar"}');
    expect(putCalled).toBe(false);
  });

  it("prefers fresh data over stale (DoNotUseStaleDataWhenSourceSucceeds)", async () => {
    let putCalled = false;
    const staleStorage: Storage = {
      async get(_key: string): Promise<StorageResult> {
        const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
        return { success: true, data: `timestamp=${twoMonthsAgo}\n{"foo":"bar"}` };
      },
      put(_key: string, _data: string): void {
        putCalled = true;
      },
    };
    const retriever = new Retriever(new FallbackDataSource(), staleStorage);
    const result = await retriever.retrieve(KEY);
    expect(result.success).toBe(true);
    expect(result.data).not.toBe("");
    expect(result.data).not.toBe(EMPTY_DATA);
    expect(result.data).not.toBe('{"foo":"bar"}');
    expect(putCalled).toBe(true);
  });
});
