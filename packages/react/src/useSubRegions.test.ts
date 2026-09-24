import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { AddressState } from "./types.js";
import { useSubRegions } from "./useSubRegions.js";

const mockTree = {
  key: "US",
  name: "United States",
  subRegions: [
    {
      key: "CA",
      name: "California",
      subRegions: [
        {
          key: "Los Angeles",
          name: "Los Angeles",
          subRegions: [],
        },
      ],
    },
    {
      key: "NY",
      name: "New York",
      subRegions: [],
    },
  ],
};

const mockState: AddressState = {
  region: "US",
  rows: [],
  fields: [],
  tree: mockTree,
  loading: false,
  error: null,
  supplier: {} as unknown as AddressState["supplier"],
  getField: () => undefined,
};

describe("useSubRegions", () => {
  it("extracts top-level subregions for ADMIN_AREA", () => {
    const { result } = renderHook(() =>
      useSubRegions("ADMIN_AREA", { state: mockState }),
    );
    expect(result.current.length).toBe(2);
    expect(result.current[0]).toEqual({
      key: "CA",
      name: "California",
      label: "California (CA)",
    });
    expect(result.current[1]).toEqual({
      key: "NY",
      name: "New York",
      label: "New York (NY)",
    });
  });

  it("extracts nested subregions for LOCALITY given parentKey", () => {
    const { result } = renderHook(() =>
      useSubRegions("LOCALITY", { state: mockState, parentKey: "CA" }),
    );
    expect(result.current.length).toBe(1);
    expect(result.current[0]?.key).toBe("Los Angeles");
  });

  it("returns empty array when tree is null", () => {
    const emptyState = { ...mockState, tree: null };
    const { result } = renderHook(() =>
      useSubRegions("ADMIN_AREA", { state: emptyState }),
    );
    expect(result.current).toEqual([]);
  });
});
