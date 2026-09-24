import { describe, expect, it } from "vitest";
import { render, renderHook, screen } from "@testing-library/react";
import type { AddressState } from "./types.js";
import { AddressProvider, useAddressContext } from "./context.js";

const mockState: AddressState = {
  region: "US",
  rows: [],
  fields: [],
  tree: null,
  loading: false,
  error: null,
  supplier: {} as unknown as AddressState["supplier"],
  getField: () => undefined,
};

describe("AddressContext", () => {
  it("throws when useAddressContext is called outside of AddressProvider", () => {
    expect(() => renderHook(() => useAddressContext())).toThrow(
      "useAddressContext must be used within an AddressProvider",
    );
  });

  it("provides the address state to children", () => {
    function Consumer() {
      const state = useAddressContext();
      return <div data-testid="region">{state.region}</div>;
    }

    render(
      <AddressProvider value={mockState}>
        <Consumer />
      </AddressProvider>,
    );

    expect(screen.getByTestId("region").textContent).toBe("US");
  });
});
