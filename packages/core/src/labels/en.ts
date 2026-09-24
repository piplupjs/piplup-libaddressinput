// English label pack for address fields.
// Supplies default human-readable labels for fields when a region's rules
// do not specify a localized variant (e.g. "Prefecture" or "Oblast").

import type { AddressField } from "../address-field.js";

export const en: Record<AddressField, string> = {
  ADMIN_AREA: "State / Province",
  LOCALITY: "City",
  DEPENDENT_LOCALITY: "District / Suburb",
  POSTAL_CODE: "Postal code",
  STREET_ADDRESS: "Street address",
  ORGANIZATION: "Organization",
  RECIPIENT: "Name",
  COUNTRY: "Country / Region",
  SORTING_CODE: "CEDEX",
};
