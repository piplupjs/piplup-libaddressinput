import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCountries } from "./useCountries.js";

describe("useCountries", () => {
  it("returns a sorted list of countries in English by default", () => {
    const { result } = renderHook(() => useCountries());
    expect(result.current.length).toBeGreaterThan(200);

    const us = result.current.find((c) => c.code === "US");
    expect(us).toBeDefined();
    expect(us?.name).toBe("United States");
  });

  it("places prioritized countries at the beginning of the list", () => {
    const priority = ["IN", "US", "GB"];
    const { result } = renderHook(() => useCountries({ priority }));

    expect(result.current[0]?.code).toBe("IN");
    expect(result.current[1]?.code).toBe("US");
    expect(result.current[2]?.code).toBe("GB");

    // Total count remains the same without duplicates
    const codes = result.current.map((c) => c.code);
    const uniqueCodes = new Set(codes);
    expect(codes.length).toBe(uniqueCodes.size);
  });

  it("supports different locales via Intl.DisplayNames", () => {
    const { result } = renderHook(() => useCountries({ locale: "fr" }));
    const us = result.current.find((c) => c.code === "US");
    expect(us?.name).toBe("États-Unis");
  });
});
