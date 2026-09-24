// Ported from cpp/test/address_field_util_test.cc (Apache-2.0, Google Inc.).

import { describe, expect, it } from "vitest";
import { parseAddressFieldsRequired, parseFormatRule } from "./address-field-util.js";
import {
  fieldElement,
  literalElement,
  newlineElement,
  type FormatElement,
} from "./format-element.js";

describe("parseFormatRule", () => {
  it("parses fields, newlines, and literals (FormatParseNewline)", () => {
    const actual = parseFormatRule("%O%n%N%n%A%nAX-%Z %C%nÅLAND");
    const expected: FormatElement[] = [
      fieldElement("ORGANIZATION"),
      newlineElement(),
      fieldElement("RECIPIENT"),
      newlineElement(),
      fieldElement("STREET_ADDRESS"),
      newlineElement(),
      literalElement("AX-"),
      fieldElement("POSTAL_CODE"),
      literalElement(" "),
      fieldElement("LOCALITY"),
      newlineElement(),
      literalElement("ÅLAND"),
    ];
    expect(actual).toEqual(expected);
  });

  it("ignores unknown tokens (FormatUnknownTokenIsIgnored)", () => {
    const actual = parseFormatRule("%1%R"); // %1 is not supported.
    expect(actual).toEqual([fieldElement("COUNTRY")]);
  });

  it("ignores a trailing % with no token (FormatPrefixWithoutTokenIsIgnored)", () => {
    expect(parseFormatRule("%")).toEqual([]);
  });

  it("returns nothing for an empty string (FormatEmptyString)", () => {
    expect(parseFormatRule("")).toEqual([]);
  });
});

describe("parseAddressFieldsRequired", () => {
  it("parses required field tokens (RequiredParseDefault)", () => {
    expect(parseAddressFieldsRequired("AC")).toEqual(["STREET_ADDRESS", "LOCALITY"]);
  });

  it("returns nothing for an empty string (RequiredEmptyString)", () => {
    expect(parseAddressFieldsRequired("")).toEqual([]);
  });
});
