import { describe, expect, it } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  FallbackAggregateSource,
  MemoryStorage,
  PreloadSupplier,
} from "@piplup/libaddressinput";
import { useAddress } from "./useAddress.js";

const supplier = new PreloadSupplier(new FallbackAggregateSource(), new MemoryStorage());

describe("useAddress", () => {
  it("handles empty region", () => {
    const { result } = renderHook(() => useAddress({ supplier, region: "" }));

    expect(result.current.loading).toBe(false);
    expect(result.current.rows).toEqual([]);
    expect(result.current.fields).toEqual([]);
    expect(result.current.tree).toBeNull();
  });

  it("loads layout and resolves fields for a region", async () => {
    const { result } = renderHook(() => useAddress({ supplier, region: "US" }));

    // Fields should be synchronously constructed from layout
    expect(result.current.fields.length).toBeGreaterThan(0);

    const street = result.current.getField("STREET_ADDRESS");
    expect(street).toBeDefined();
    expect(street?.label).toBe("Street address");
    expect(street?.required).toBe(true);
    expect(street?.autoComplete).toBe("street-address");

    // Also lookup by dataKey
    const zip = result.current.getField("postalCode");
    expect(zip).toBeDefined();
    expect(zip?.field).toBe("POSTAL_CODE");
    expect(zip?.label).toBe("ZIP code");

    // Wait for async region tree to populate subregions on ADMIN_AREA
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const stateField = result.current.getField("ADMIN_AREA");
    expect(stateField).toBeDefined();
    expect(stateField?.isSelect).toBe(true);
    expect(stateField?.options?.length).toBeGreaterThan(0);
    const ca = stateField?.options?.find((o) => o.key === "CA");
    expect(ca).toBeDefined();
    expect(ca?.name).toBe("California");
  });

  it("supports custom labels and messages", async () => {
    const { result } = renderHook(() =>
      useAddress({
        supplier,
        region: "US",
        labels: {
          STREET_ADDRESS: "Custom Address Line",
        },
      }),
    );

    const street = result.current.getField("STREET_ADDRESS");
    expect(street?.label).toBe("Custom Address Line");
  });
});
