import type { AddressData } from '../address-data.js';
import type { AddressField } from '../address-field.js';

/**
 * Maps an AddressField enum to its corresponding property key on AddressData.
 */
export const FIELD_TO_DATA_KEY: Record<AddressField, keyof AddressData> = {
  ADMIN_AREA: 'administrativeArea',
  COUNTRY: 'regionCode',
  DEPENDENT_LOCALITY: 'dependentLocality',
  LOCALITY: 'locality',
  ORGANIZATION: 'organization',
  POSTAL_CODE: 'postalCode',
  RECIPIENT: 'recipient',
  SORTING_CODE: 'sortingCode',
  STREET_ADDRESS: 'addressLine',
};

/**
 * Maps an AddressData property key back to its AddressField enum.
 */
export const DATA_KEY_TO_FIELD: Partial<Record<keyof AddressData, AddressField>> = {
  addressLine: 'STREET_ADDRESS',
  administrativeArea: 'ADMIN_AREA',
  dependentLocality: 'DEPENDENT_LOCALITY',
  locality: 'LOCALITY',
  organization: 'ORGANIZATION',
  postalCode: 'POSTAL_CODE',
  recipient: 'RECIPIENT',
  regionCode: 'COUNTRY',
  sortingCode: 'SORTING_CODE',
};

/**
 * Maps an AddressField to its standard W3C / WHATWG HTML autocomplete token.
 * Enables modern browser autofill out of the box in form inputs.
 */
export const FIELD_TO_AUTOCOMPLETE: Record<AddressField, string> = {
  ADMIN_AREA: 'address-level1',
  COUNTRY: 'country',
  DEPENDENT_LOCALITY: 'address-level3',
  LOCALITY: 'address-level2',
  ORGANIZATION: 'organization',
  POSTAL_CODE: 'postal-code',
  RECIPIENT: 'name',
  SORTING_CODE: 'postal-code',
  STREET_ADDRESS: 'street-address',
};

/**
 * Gets the AddressData property key for a given AddressField enum.
 * E.g. getFieldKey("LOCALITY") -> "locality".
 */
export function getFieldKey(field: AddressField): keyof AddressData {
  return FIELD_TO_DATA_KEY[field] ?? 'regionCode';
}

/**
 * Gets the standard HTML autocomplete attribute value for a given AddressField enum.
 * E.g. getFieldAutocomplete("POSTAL_CODE") -> "postal-code".
 */
export function getFieldAutocomplete(field: AddressField): string {
  return FIELD_TO_AUTOCOMPLETE[field] ?? 'off';
}
