// No upstream C++ test file to port from — see controller.ts's header. These
// tests exercise the state machine directly: region switching (load + layout
// + region tree + value pruning), field updates, debounced validation, and
// reset.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FallbackAggregateSource } from "../../test/fake-sources.js";
import { NullStorage } from "../storage.js";
import { PreloadSupplier } from "../supplier/preload.js";
import { createAddressForm, type AddressFormState } from "./controller.js";

describe("createAddressForm", () => {
  let supplier: PreloadSupplier;

  beforeEach(() => {
    supplier = new PreloadSupplier(new FallbackAggregateSource(), new NullStorage());
  });

  it("starts empty with no region", () => {
    const form = createAddressForm({ supplier });
    const state = form.getState();
    expect(state.values).toEqual({ regionCode: "" });
    expect(state.layout).toBeNull();
    expect(state.regionTree).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("subscribe fires immediately with the current state and returns an unsubscribe fn", () => {
    const form = createAddressForm({ supplier });
    const seen: AddressFormState[] = [];
    const unsubscribe = form.subscribe((s) => seen.push(s));
    expect(seen).toHaveLength(1);
    unsubscribe();
    form.setField("locality", "X");
    expect(seen).toHaveLength(1); // no further notifications after unsubscribe
  });

  it("setRegion loads data and builds layout + region tree", async () => {
    const form = createAddressForm({ supplier });
    const loadingStates: boolean[] = [];
    form.subscribe((s) => loadingStates.push(s.loading));

    await form.setRegion("US");

    const state = form.getState();
    expect(state.values.regionCode).toBe("US");
    expect(state.layout?.rows.length).toBeGreaterThan(0);
    expect(state.regionTree?.subRegions.length).toBeGreaterThan(0);
    expect(loadingStates).toContain(true);
    expect(state.loading).toBe(false);
  });

  it("setRegion drops values the new region doesn't use", async () => {
    const form = createAddressForm({
      supplier,
      initial: { regionCode: "US", dependentLocality: "should be dropped for US" },
    });
    await form.setRegion("US");
    // US's format doesn't include DEPENDENT_LOCALITY.
    expect(form.getState().values.dependentLocality).toBeUndefined();
  });

  it("setRegion carries over values for fields the new region still uses", async () => {
    const form = createAddressForm({
      supplier,
      initial: { regionCode: "US", postalCode: "94043" },
    });
    await form.setRegion("US");
    expect(form.getState().values.postalCode).toBe("94043");
  });

  it("setRegion('') clears layout/region tree/values", async () => {
    const form = createAddressForm({ supplier });
    await form.setRegion("US");
    await form.setRegion("");
    const state = form.getState();
    expect(state.values).toEqual({ regionCode: "" });
    expect(state.layout).toBeNull();
    expect(state.regionTree).toBeNull();
  });

  it("setField updates values, marks touched and dirty", async () => {
    const form = createAddressForm({ supplier });
    await form.setRegion("US");
    form.setField("locality", "Mountain View");
    const state = form.getState();
    expect(state.values.locality).toBe("Mountain View");
    expect(state.touched.locality).toBe(true);
    expect(state.dirty).toBe(true);
  });

  it("setField debounces auto-validation", async () => {
    vi.useFakeTimers();
    try {
      const form = createAddressForm({ supplier, debounceMs: 100 });
      await form.setRegion("US");
      form.setField("postalCode", "123"); // invalid format for US

      expect(form.getState().problems).toEqual([]); // not yet validated
      await vi.advanceTimersByTimeAsync(100);
      expect(form.getState().problems.some((p) => p.field === "POSTAL_CODE")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("validate() bypasses the debounce and returns problems immediately", async () => {
    const form = createAddressForm({ supplier });
    await form.setRegion("US");
    form.setField("postalCode", "123");
    const problems = await form.validate();
    expect(problems.some((p) => p.field === "POSTAL_CODE")).toBe(true);
    expect(form.getState().problems).toEqual(problems);
  });

  it("normalizeValues converts a full admin-area name to its canonical key", async () => {
    const form = createAddressForm({ supplier });
    await form.setRegion("US");
    form.setField("administrativeArea", "California");
    form.normalizeValues();
    expect(form.getState().values.administrativeArea).toBe("CA");
  });

  it("reset restores the initial address and re-loads its region", async () => {
    const form = createAddressForm({ supplier, initial: { regionCode: "US" } });
    await form.setRegion("US");
    form.setField("locality", "Mountain View");
    expect(form.getState().dirty).toBe(true);

    form.reset();
    await vi.waitFor(() => expect(form.getState().layout).not.toBeNull());

    const state = form.getState();
    expect(state.values).toEqual({ regionCode: "US" });
    expect(state.dirty).toBe(false);
    expect(state.touched).toEqual({});
  });

  it("a superseded setRegion call doesn't clobber the latest one", async () => {
    const form = createAddressForm({ supplier });
    const first = form.setRegion("US");
    const second = form.setRegion("CA");
    await Promise.all([first, second]);
    expect(form.getState().values.regionCode).toBe("CA");
  });

  it("exposes userProblems and isValid correctly in state", async () => {
    const form = createAddressForm({ supplier });
    await form.setRegion("US");
    form.setField("locality", "Mountain View");
    form.setField("administrativeArea", "CA");
    form.setField("postalCode", "94043");
    form.setField("addressLine", ["1600 Amphitheatre Pkwy"]);

    await form.validate();
    const state = form.getState();
    // Raw problems may contain UNSUPPORTED_FIELD for locality/dependent locality
    expect(state.problems.some((p) => p.problem === "UNSUPPORTED_FIELD")).toBe(true);
    // userProblems filters them out, leaving 0 user errors
    expect(state.userProblems).toHaveLength(0);
    expect(state.isValid).toBe(true);

    // Enter invalid postal code
    form.setField("postalCode", "invalid");
    await form.validate();
    const invalidState = form.getState();
    expect(invalidState.userProblems.some((p) => p.field === "POSTAL_CODE")).toBe(true);
    expect(invalidState.isValid).toBe(false);
  });

  it("setField accepts AddressField enums directly", async () => {
    const form = createAddressForm({ supplier });
    await form.setRegion("US");
    form.setField("LOCALITY", "Sunnyvale");
    form.setField("ADMIN_AREA", "California");
    expect(form.getState().values.locality).toBe("Sunnyvale");
    expect(form.getState().values.administrativeArea).toBe("California");
  });

  it("getSubRegions returns subregions from the loaded region tree", async () => {
    const form = createAddressForm({ supplier });
    expect(form.getSubRegions()).toEqual([]);

    await form.setRegion("US");
    const usSubRegions = form.getSubRegions();
    expect(usSubRegions.length).toBeGreaterThan(0);
    expect(usSubRegions.some((r) => r.key === "CA")).toBe(true);
  });

  it("dispose clears pending debounce and listeners", async () => {
    vi.useFakeTimers();
    try {
      const form = createAddressForm({ supplier, debounceMs: 100 });
      await form.setRegion("US");

      const seen: AddressFormState[] = [];
      form.subscribe((s) => seen.push(s));
      expect(seen).toHaveLength(1); // Initial notification on subscribe

      form.setField("postalCode", "123"); // Schedules debounce
      expect(seen).toHaveLength(2); // setField triggers state update
      const countBeforeDispose = seen.length;

      form.dispose(); // Clear debounce and listeners

      await vi.advanceTimersByTimeAsync(100);
      expect(seen).toHaveLength(countBeforeDispose); // Debounce didn't fire, no new notifications
    } finally {
      vi.useRealTimers();
    }
  });

  it("reset calls dispose before resetting state", async () => {
    vi.useFakeTimers();
    try {
      const form = createAddressForm({ supplier, debounceMs: 100 });
      await form.setRegion("US");
      form.setField("locality", "Mountain View");

      expect(form.getState().dirty).toBe(true);
      form.reset();

      expect(form.getState().dirty).toBe(false);
      expect(form.getState().touched).toEqual({});

      await vi.advanceTimersByTimeAsync(100);
      // No validation runs because debounce was cleared by reset
      expect(form.getState().problems).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
