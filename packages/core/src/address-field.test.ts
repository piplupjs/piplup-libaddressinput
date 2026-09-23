import { describe, expect, it } from "vitest";
import { ADDRESS_FIELDS, isAddressField } from "./address-field.js";

describe("isAddressField", () => {
  it("accepts every declared field", () => {
    for (const field of ADDRESS_FIELDS) {
      expect(isAddressField(field)).toBe(true);
    }
  });

  it("rejects unknown strings", () => {
    expect(isAddressField("NOT_A_FIELD")).toBe(false);
    expect(isAddressField("")).toBe(false);
  });
});
