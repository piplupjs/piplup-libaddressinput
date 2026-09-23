// Port of cpp/include/libaddressinput/address_validator.h (Apache-2.0, Google Inc.)
//
// STATUS: Phase 4 stub. Not yet implemented — see .planning/PLAN.md §6 Phase 4.

import type { AddressData } from "./address-data.js";
import type { AddressField } from "./address-field.js";
import type { AddressProblem } from "./problem.js";

export interface ValidationProblem {
  field: AddressField;
  problem: AddressProblem;
}

export interface ValidateOptions {
  allowPostal?: boolean;
  requireName?: boolean;
  /** Only report these field/problem pairs. */
  filter?: ValidationProblem[];
}

/**
 * Validates an address against the loaded metadata for its region.
 * `supplier` is typed unknown for now until the supplier module (Phase 2)
 * lands. Not yet implemented.
 */
export function validate(
  _supplier: unknown,
  _address: AddressData,
  _options?: ValidateOptions,
): ValidationProblem[] {
  throw new Error("validate: not implemented yet (see .planning/PLAN.md Phase 4)");
}
