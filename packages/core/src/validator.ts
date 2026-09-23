// Port of cpp/include/libaddressinput/address_validator.h's
// `AddressValidator::Validate` (Apache-2.0, Google Inc.). The actual
// checks live in internal/validation-task.ts; this is the supplier-
// resolution half — mirrors upstream's `ValidationTask::Run`.

import type { AddressData } from "./address-data.js";
import { lookupKeyFromAddress } from "./internal/lookup-key.js";
import { runValidationChecks } from "./internal/validation-task.js";
import type { Supplier } from "./supplier/supplier.js";

export type { ValidationProblem } from "./internal/validation-task.js";
import type { ValidationProblem } from "./internal/validation-task.js";

export interface ValidateOptions {
  /** Allow postal (non-physical) addresses, e.g. P.O. boxes. Default false. */
  allowPostal?: boolean;
  /** Treat RECIPIENT as a required field. Default false. */
  requireName?: boolean;
  /**
   * Only report these field/problem pairs. If omitted or empty, every
   * problem found is reported.
   */
  filter?: ValidationProblem[];
}

/**
 * Validates an address against a Supplier's metadata. Mirrors
 * `AddressValidator::Validate`.
 */
export async function validate(
  supplier: Supplier,
  address: AddressData,
  options: ValidateOptions = {},
): Promise<ValidationProblem[]> {
  const { allowPostal = false, requireName = false, filter } = options;

  const lookupKey = lookupKeyFromAddress(address);
  const maxDepth = supplier.getLoadedRuleDepth(address.regionCode);
  const { success, hierarchy } = await supplier.supplyGlobally(lookupKey);

  if (!success) {
    return [];
  }

  return runValidationChecks(address, hierarchy, {
    allowPostal,
    requireName,
    filter,
    maxDepth,
  });
}
