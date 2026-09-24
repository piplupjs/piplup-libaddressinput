import type { AddressData } from "../address-data.js";
import type { AddressField } from "../address-field.js";

/**
 * Maps an AddressField enum to its corresponding property key on AddressData.
 */
export const FIELD_TO_DATA_KEY: Record<AddressField, keyof AddressData> = {
  ADMIN_AREA: "administrativeArea",
  LOCALITY: "locality",
  DEPENDENT_LOCALITY: "dependentLocality",
  SORTING_CODE: "sortingCode",
  POSTAL_CODE: "postalCode",
  STREET_ADDRESS: "addressLine",
  ORGANIZATION: "organization",
  RECIPIENT: "recipient",
  COUNTRY: "regionCode",
};

/**
 * Maps an AddressData property key back to its AddressField enum.
 */
export const DATA_KEY_TO_FIELD: Partial<Record<keyof AddressData, AddressField>> = {
  administrativeArea: "ADMIN_AREA",
  locality: "LOCALITY",
  dependentLocality: "DEPENDENT_LOCALITY",
  sortingCode: "SORTING_CODE",
  postalCode: "POSTAL_CODE",
  addressLine: "STREET_ADDRESS",
  organization: "ORGANIZATION",
  recipient: "RECIPIENT",
  regionCode: "COUNTRY",
};

/**
 * Maps an AddressField to its standard W3C / WHATWG HTML autocomplete token.
 * Enables modern browser autofill out of the box in form inputs.
 */
export const FIELD_TO_AUTOCOMPLETE: Record<AddressField, string> = {
  RECIPIENT: "name",
  ORGANIZATION: "organization",
  STREET_ADDRESS: "street-address",
  ADMIN_AREA: "address-level1",
  LOCALITY: "address-level2",
  DEPENDENT_LOCALITY: "address-level3",
  POSTAL_CODE: "postal-code",
  SORTING_CODE: "postal-code",
  COUNTRY: "country",
};

/**
 * Gets the AddressData property key for a given AddressField enum.
 * E.g. getFieldKey("LOCALITY") -> "locality".
 */
export function getFieldKey(field: AddressField): keyof AddressData {
  return FIELD_TO_DATA_KEY[field] ?? "regionCode";
}

/**
 * Gets the standard HTML autocomplete attribute value for a given AddressField enum.
 * E.g. getFieldAutocomplete("POSTAL_CODE") -> "postal-code".
 */
export function getFieldAutocomplete(field: AddressField): string {
  return FIELD_TO_AUTOCOMPLETE[field] ?? "off";
}
