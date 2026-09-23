// Port of cpp/include/libaddressinput/address_data.h (Apache-2.0, Google Inc.)
//
// Plain, JSON-serializable address record. Mirrors the fields of the C++
// AddressData struct. All fields are optional strings/string arrays; callers
// build these as plain object literals rather than via a constructor.

import type { AddressField } from "./address-field.js";

export interface AddressData {
  /** CLDR region code, e.g. "US", "JP". Required for most operations. */
  regionCode: string;
  /** Street address lines, in order. */
  addressLine?: string[] | undefined;
  /** Top-level administrative subdivision (state/province/region). */
  administrativeArea?: string | undefined;
  /** City/town. */
  locality?: string | undefined;
  /** Subdivision of locality (e.g. suburb, neighborhood). */
  dependentLocality?: string | undefined;
  postalCode?: string | undefined;
  sortingCode?: string | undefined;
  /** BCP-47 language tag of the address's contents. */
  languageCode?: string | undefined;
  organization?: string | undefined;
  recipient?: string | undefined;
}

/** Returns a new AddressData with all optional fields defaulted to omitted/empty. */
export function createAddressData(regionCode: string): AddressData {
  return { regionCode };
}

// Port of address_data.cc's field-access helpers. A string is "empty" if
// it's empty or contains only whitespace (matches upstream's IsStringEmpty,
// `\S` regex check).
function isStringEmpty(value: string): boolean {
  return value.trim().length === 0;
}

const SCALAR_FIELD_KEYS: Partial<Record<AddressField, keyof AddressData>> = {
  COUNTRY: "regionCode",
  ADMIN_AREA: "administrativeArea",
  LOCALITY: "locality",
  DEPENDENT_LOCALITY: "dependentLocality",
  SORTING_CODE: "sortingCode",
  POSTAL_CODE: "postalCode",
  ORGANIZATION: "organization",
  RECIPIENT: "recipient",
};

/**
 * Returns the value of a scalar (non-repeated) field. Throws for
 * STREET_ADDRESS, which is repeated — use `address.addressLine` directly,
 * matching upstream's assert that GetFieldValue is never called for it.
 */
export function getFieldValue(address: AddressData, field: AddressField): string {
  const key = SCALAR_FIELD_KEYS[field];
  if (key === undefined) {
    throw new Error(`getFieldValue: ${field} is a repeated field; read addressLine`);
  }
  return (address[key] as string | undefined) ?? "";
}

/** Mirrors `AddressData::IsFieldEmpty`. */
export function isFieldEmpty(address: AddressData, field: AddressField): boolean {
  if (field === "STREET_ADDRESS") {
    const lines = address.addressLine ?? [];
    return lines.every(isStringEmpty);
  }
  return isStringEmpty(getFieldValue(address, field));
}
