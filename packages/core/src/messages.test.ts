// Adapted from cpp/test/localization_test.cc (Apache-2.0, Google Inc.),
// reshaped for the id+params split (see messages.ts's header comment).

import { describe, expect, it } from "vitest";
import { formatMessage, formatProblemMessage, getProblemMessage } from "./messages.js";
import { en } from "./messages/en.js";
import { createEmptyRule } from "./internal/rule.js";
import type { AddressData } from "./address-data.js";

describe("formatMessage", () => {
  it("substitutes positional placeholders", () => {
    expect(formatMessage("Hello, $1! You have $2 items.", ["Ada", "3"])).toBe(
      "Hello, Ada! You have 3 items.",
    );
  });

  it("escapes $$ to a literal $", () => {
    expect(formatMessage("Price: $$1$1", ["0"])).toBe("Price: $10");
  });

  it("drops an out-of-range placeholder", () => {
    expect(formatMessage("$1 and $2", ["only one"])).toBe("only one and ");
  });
});

describe("getProblemMessage", () => {
  const address: AddressData = { regionCode: "US" };

  it("MISSING_REQUIRED_FIELD needs no params for a non-postal field", () => {
    const msg = getProblemMessage(address, "LOCALITY", "MISSING_REQUIRED_FIELD", createEmptyRule());
    expect(msg).toEqual({ id: "MISSING_REQUIRED_FIELD", params: [] });
    expect(formatProblemMessage(msg, en)).toBe("You can't leave this empty.");
  });

  it("UNKNOWN_VALUE includes the offending value", () => {
    const msg = getProblemMessage(
      { regionCode: "US", administrativeArea: "Cupertino" },
      "ADMIN_AREA",
      "UNKNOWN_VALUE",
      createEmptyRule(),
    );
    expect(msg).toEqual({ id: "UNKNOWN_VALUE", params: ["Cupertino"] });
    expect(formatProblemMessage(msg, en)).toBe(
      "Cupertino is not recognized as a known value for this field.",
    );
  });

  it("USES_P_O_BOX needs no params", () => {
    const msg = getProblemMessage(address, "STREET_ADDRESS", "USES_P_O_BOX", createEmptyRule());
    expect(msg.id).toBe("PO_BOX_FORBIDDEN_VALUE");
  });

  it("POSTAL_CODE MISSING_REQUIRED_FIELD with example and URL picks the ZIP variant for a US-shaped rule", () => {
    const rule = {
      ...createEmptyRule(),
      postalCodeExample: "90291,90210",
      postServiceUrl: "https://tools.usps.com/",
      postalCodeNameMessageId: "IDS_LIBADDRESSINPUT_ZIP_CODE_LABEL" as const,
    };
    const msg = getProblemMessage(address, "POSTAL_CODE", "MISSING_REQUIRED_FIELD", rule);
    expect(msg.id).toBe("MISSING_REQUIRED_ZIP_CODE_EXAMPLE_AND_URL");
    expect(msg.params[0]).toBe("90291"); // first example only
    expect(formatProblemMessage(msg, en)).toContain("90291");
    expect(formatProblemMessage(msg, en)).toContain('<a href="https://tools.usps.com/">');
  });

  it("POSTAL_CODE MISSING_REQUIRED_FIELD with no example/url falls back to the generic message", () => {
    const msg = getProblemMessage(address, "POSTAL_CODE", "MISSING_REQUIRED_FIELD", createEmptyRule());
    expect(msg).toEqual({ id: "MISSING_REQUIRED_FIELD", params: [] });
  });

  it("POSTAL_CODE MISMATCHING_VALUE picks the postal-code label variant when applicable", () => {
    const rule = {
      ...createEmptyRule(),
      postServiceUrl: "https://post.ch/",
      postalCodeNameMessageId: "IDS_LIBADDRESSINPUT_POSTAL_CODE_LABEL" as const,
    };
    const msg = getProblemMessage(address, "POSTAL_CODE", "MISMATCHING_VALUE", rule);
    expect(msg.id).toBe("MISMATCHING_VALUE_POSTAL_CODE_URL");
  });

  it("respects enableExamples: false and enableLinks: false", () => {
    const rule = {
      ...createEmptyRule(),
      postalCodeExample: "90291",
      postServiceUrl: "https://tools.usps.com/",
    };
    const msg = getProblemMessage(address, "POSTAL_CODE", "MISSING_REQUIRED_FIELD", rule, {
      enableExamples: false,
      enableLinks: false,
    });
    expect(msg).toEqual({ id: "MISSING_REQUIRED_FIELD", params: [] });
  });
});
