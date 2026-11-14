// English label pack for address fields.
// Supplies default human-readable labels for fields when a region's rules
// do not specify a localized variant (e.g. "Prefecture" or "Oblast").

import type { AddressField } from '../address-field.js';

export const en: Record<AddressField, string> = {
  ADMIN_AREA: 'State / Province',
  COUNTRY: 'Country / Region',
  DEPENDENT_LOCALITY: 'District / Suburb',
  LOCALITY: 'City',
  ORGANIZATION: 'Organization',
  POSTAL_CODE: 'Postal code',
  RECIPIENT: 'Name',
  SORTING_CODE: 'CEDEX',
  STREET_ADDRESS: 'Street address',
};
