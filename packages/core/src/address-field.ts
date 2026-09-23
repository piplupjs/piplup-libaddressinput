// Port of cpp/include/libaddressinput/address_field.h (Apache-2.0, Google Inc.)
//
// The fields that make up a postal address, in the order upstream declares
// them. Kept as a string union (not a numeric enum) so values serialize
// legibly and match upstream's field name strings used elsewhere in the data
// (e.g. AddressField::ToString equivalents used by callers/tests).

export const ADDRESS_FIELDS = [
  "COUNTRY",
  "ADMIN_AREA",
  "LOCALITY",
  "DEPENDENT_LOCALITY",
  "SORTING_CODE",
  "POSTAL_CODE",
  "STREET_ADDRESS",
  "ORGANIZATION",
  "RECIPIENT",
] as const;

export type AddressField = (typeof ADDRESS_FIELDS)[number];

export function isAddressField(value: string): value is AddressField {
  return (ADDRESS_FIELDS as readonly string[]).includes(value);
}
