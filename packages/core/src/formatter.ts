// Port of cpp/include/libaddressinput/address_formatter.h (Apache-2.0, Google Inc.)
//
// STATUS: Phase 3 stub. Not yet implemented — see .planning/PLAN.md §6 Phase 3.

import type { AddressData } from "./address-data.js";

export interface FormatAddressOptions {
  /** Use the Latin-script format (lfmt) instead of the native one (fmt). */
  latin?: boolean;
}

/**
 * Formats an address into national-format lines, mirroring
 * GetFormattedNationalAddress. Not yet implemented.
 */
export function formatAddress(
  _address: AddressData,
  _options?: FormatAddressOptions,
): string[] {
  throw new Error("formatAddress: not implemented yet (see .planning/PLAN.md Phase 3)");
}
