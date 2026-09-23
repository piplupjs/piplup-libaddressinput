// Adapted from cpp/test/validating_util_test.cc and validating_storage_test.cc
// (Apache-2.0, Google Inc.). Only the timestamp/staleness behavior is
// ported — there's no checksum step to test here; see validating-storage.ts's
// header comment for why.

import { describe, expect, it } from "vitest";
import { MemoryStorage } from "../storage.js";
import { __internal, ValidatingStorage } from "./validating-storage.js";

const { wrap, unwrap, STALENESS_THRESHOLD_MS } = __internal;

const DATA = "{'foo': 'bar'}";
const TIMESTAMP_MS = 1_388_001_600_000;
const HALF_MONTH_MS = 15 * 24 * 60 * 60 * 1000;
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

describe("wrap/unwrap (ValidatingUtilTest, checksum cases removed)", () => {
  it("rejects an empty string (UnwrapTimestamp_EmptyString)", () => {
    expect(unwrap("", TIMESTAMP_MS)).toBeUndefined();
  });

  it("rejects garbage data (UnwrapTimestamp_GarbageData)", () => {
    expect(unwrap("garbage", TIMESTAMP_MS)).toBeUndefined();
  });

  it("rejects a corrupted prefix (UnwrapTimestamp_CorruptedData)", () => {
    expect(unwrap(`timestamP=${TIMESTAMP_MS}\n${DATA}`, TIMESTAMP_MS)).toBeUndefined();
  });

  it("accepts a recent timestamp (UnwrapTimestamp_Recent)", () => {
    const wrapped = wrap(TIMESTAMP_MS - HALF_MONTH_MS, DATA);
    expect(unwrap(wrapped, TIMESTAMP_MS)).toBe(DATA);
  });

  it("rejects a stale timestamp (UnwrapTimestamp_Stale)", () => {
    const wrapped = wrap(TIMESTAMP_MS - TWO_MONTHS_MS, DATA);
    expect(unwrap(wrapped, TIMESTAMP_MS)).toBeUndefined();
  });

  it("round-trips (Wrap / WrapUnwrapIt)", () => {
    const wrapped = wrap(TIMESTAMP_MS, DATA);
    expect(wrapped).toBe(`timestamp=${TIMESTAMP_MS}\n${DATA}`);
    expect(unwrap(wrapped, TIMESTAMP_MS)).toBe(DATA);
  });

  it("uses a 30-day staleness threshold", () => {
    expect(STALENESS_THRESHOLD_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });
});

describe("ValidatingStorage (adapted from ValidatingStorageTest)", () => {
  it("reports a miss as a miss", async () => {
    const storage = new ValidatingStorage(new MemoryStorage());
    const result = await storage.get("missing");
    expect(result).toEqual({ success: false, data: undefined });
  });

  it("returns fresh data written through it", async () => {
    let now = TIMESTAMP_MS;
    const storage = new ValidatingStorage(new MemoryStorage(), { now: () => now });
    await storage.put("key", DATA);
    now += 1000; // A second later is still fresh.
    expect(await storage.get("key")).toEqual({ success: true, data: DATA });
  });

  it("reports success:false but still returns stale data", async () => {
    let now = TIMESTAMP_MS;
    const storage = new ValidatingStorage(new MemoryStorage(), { now: () => now });
    await storage.put("key", DATA);
    now += TWO_MONTHS_MS;
    expect(await storage.get("key")).toEqual({ success: false, data: DATA });
  });

  it("treats a malformed underlying entry as a miss", async () => {
    const underlying = new MemoryStorage();
    underlying.put("key", "not wrapped at all");
    const storage = new ValidatingStorage(underlying);
    expect(await storage.get("key")).toEqual({ success: false, data: undefined });
  });
});
