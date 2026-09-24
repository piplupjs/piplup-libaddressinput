import { describe, expect, it } from "vitest";
import {
  getFieldKey,
  getFieldAutocomplete,
  FIELD_TO_DATA_KEY,
  DATA_KEY_TO_FIELD,
  FIELD_TO_AUTOCOMPLETE,
} from "./fields.js";

describe("ui/fields", () => {
  it("maps each AddressField to the correct AddressData property key", () => {
    expect(FIELD_TO_DATA_KEY.LOCALITY).toBe("locality");
    expect(FIELD_TO_DATA_KEY.POSTAL_CODE).toBe("postalCode");
    expect(getFieldKey("LOCALITY")).toBe("locality");
    expect(getFieldKey("ADMIN_AREA")).toBe("administrativeArea");
    expect(getFieldKey("DEPENDENT_LOCALITY")).toBe("dependentLocality");
    expect(getFieldKey("POSTAL_CODE")).toBe("postalCode");
    expect(getFieldKey("STREET_ADDRESS")).toBe("addressLine");
    expect(getFieldKey("ORGANIZATION")).toBe("organization");
    expect(getFieldKey("RECIPIENT")).toBe("recipient");
    expect(getFieldKey("SORTING_CODE")).toBe("sortingCode");
    expect(getFieldKey("COUNTRY")).toBe("regionCode");
  });

  it("reverses data keys back to AddressField", () => {
    expect(DATA_KEY_TO_FIELD.locality).toBe("LOCALITY");
    expect(DATA_KEY_TO_FIELD.administrativeArea).toBe("ADMIN_AREA");
    expect(DATA_KEY_TO_FIELD.postalCode).toBe("POSTAL_CODE");
    expect(DATA_KEY_TO_FIELD.addressLine).toBe("STREET_ADDRESS");
  });

  it("maps address fields to standard HTML autocomplete tokens", () => {
    expect(FIELD_TO_AUTOCOMPLETE.POSTAL_CODE).toBe("postal-code");
    expect(getFieldAutocomplete("RECIPIENT")).toBe("name");
    expect(getFieldAutocomplete("ORGANIZATION")).toBe("organization");
    expect(getFieldAutocomplete("STREET_ADDRESS")).toBe("street-address");
    expect(getFieldAutocomplete("ADMIN_AREA")).toBe("address-level1");
    expect(getFieldAutocomplete("LOCALITY")).toBe("address-level2");
    expect(getFieldAutocomplete("DEPENDENT_LOCALITY")).toBe("address-level3");
    expect(getFieldAutocomplete("POSTAL_CODE")).toBe("postal-code");
    expect(getFieldAutocomplete("COUNTRY")).toBe("country");
  });
});
