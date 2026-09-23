// Port of cpp/include/libaddressinput/address_data.h (Apache-2.0, Google Inc.)
//
// Plain, JSON-serializable address record. Mirrors the fields of the C++
// AddressData struct. All fields are optional strings/string arrays; callers
// build these as plain object literals rather than via a constructor.

export interface AddressData {
  /** CLDR region code, e.g. "US", "JP". Required for most operations. */
  regionCode: string;
  /** Street address lines, in order. */
  addressLine?: string[];
  /** Top-level administrative subdivision (state/province/region). */
  administrativeArea?: string;
  /** City/town. */
  locality?: string;
  /** Subdivision of locality (e.g. suburb, neighborhood). */
  dependentLocality?: string;
  postalCode?: string;
  sortingCode?: string;
  /** BCP-47 language tag of the address's contents. */
  languageCode?: string;
  organization?: string;
  recipient?: string;
}

/** Returns a new AddressData with all optional fields defaulted to omitted/empty. */
export function createAddressData(regionCode: string): AddressData {
  return { regionCode };
}
