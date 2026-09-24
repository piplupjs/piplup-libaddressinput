import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { AddressState } from "./types.js";
import { AddressProvider } from "./context.js";
import { useField } from "./useField.js";

const mockField = {
  field: "POSTAL_CODE" as const,
  key: "postalCode" as const,
  label: "ZIP code",
  required: true,
  autoComplete: "postal-code",
  isSelect: false,
  multiline: false,
  length: "short" as const,
};

const mockState: AddressState = {
  region: "US",
  rows: [[mockField]],
  fields: [mockField],
  tree: null,
  loading: false,
  error: null,
  supplier: {} as unknown as AddressState["supplier"],
  getField: (query) =>
    query === "POSTAL_CODE" || query === "postalCode" ? mockField : undefined,
};

describe("useField", () => {
  it("throws when called without context or state option", () => {
    expect(() => renderHook(() => useField("POSTAL_CODE"))).toThrow(
      "useField must be used within an AddressProvider or supplied with an explicit state option",
    );
  });

  it("reads field from context", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AddressProvider value={mockState}>{children}</AddressProvider>
    );

    const { result } = renderHook(() => useField("POSTAL_CODE"), { wrapper });
    expect(result.current).toEqual(mockField);
  });

  it("reads field from explicit state option without context", () => {
    const { result } = renderHook(() => useField("postalCode", { state: mockState }));
    expect(result.current).toEqual(mockField);
  });
});
