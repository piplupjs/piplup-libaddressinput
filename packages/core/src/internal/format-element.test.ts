// Adapted from cpp/test/format_element_test.cc (Apache-2.0, Google Inc.).
//
// Upstream tests IsNewline()/IsField() and the ostream operator on a single
// FormatElement class. This port uses a discriminated union instead (see
// format-element.ts), so the equivalent checks are on `.kind` and on
// formatElementsEqual().

import { describe, expect, it } from "vitest";
import {
  fieldElement,
  formatElementsEqual,
  literalElement,
  newlineElement,
} from "./format-element.js";

describe("FormatElement kinds", () => {
  it("discriminates newline / literal / field (IsNewline, IsField)", () => {
    expect(newlineElement().kind).toBe("newline");
    expect(literalElement(" ").kind).toBe("literal");
    expect(fieldElement("SORTING_CODE").kind).toBe("field");
  });

  it("rejects an empty literal, matching the upstream assert", () => {
    expect(() => literalElement("")).toThrow();
  });
});

describe("formatElementsEqual", () => {
  it("treats all newlines as equal", () => {
    expect(formatElementsEqual(newlineElement(), newlineElement())).toBe(true);
  });

  it("compares literals by value", () => {
    expect(formatElementsEqual(literalElement("Text"), literalElement("Text"))).toBe(
      true,
    );
    expect(formatElementsEqual(literalElement("Text"), literalElement("Other"))).toBe(
      false,
    );
  });

  it("compares fields by value", () => {
    expect(
      formatElementsEqual(fieldElement("SORTING_CODE"), fieldElement("SORTING_CODE")),
    ).toBe(true);
    expect(
      formatElementsEqual(fieldElement("SORTING_CODE"), fieldElement("LOCALITY")),
    ).toBe(false);
  });

  it("never equates elements of different kinds", () => {
    expect(formatElementsEqual(newlineElement(), literalElement("\n"))).toBe(false);
    expect(formatElementsEqual(fieldElement("COUNTRY"), literalElement("R"))).toBe(false);
  });
});
