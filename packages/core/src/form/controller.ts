// Headless form state controller — no upstream C++/Java equivalent is ported
// directly; this captures the behavior of Java's AddressWidget without any
// view code. See .planning/PLAN.md §6 Phase 7.
//
// STATUS: Phase 7 stub. Not yet implemented. Framework bindings (React hooks
// etc.) are NOT part of this module — see examples/ per PLAN.md §7a.

import type { AddressData } from "../address-data.js";
import type { AddressLayout } from "../layout.js";
import type { ValidationProblem } from "../validator.js";

export interface AddressFormState {
  values: AddressData;
  layout: AddressLayout | null;
  problems: ValidationProblem[];
  loading: boolean;
  error: unknown;
  touched: Partial<Record<keyof AddressData, boolean>>;
  dirty: boolean;
}

export interface AddressFormOptions {
  supplier: unknown;
  uiLanguage?: string;
  initial?: AddressData;
}

export interface AddressFormController {
  getState(): AddressFormState;
  subscribe(listener: (state: AddressFormState) => void): () => void;
  setField(field: keyof AddressData, value: string | string[] | undefined): void;
  setRegion(regionCode: string): Promise<void>;
  validate(): ValidationProblem[];
  reset(): void;
}

/** Creates a framework-agnostic address form controller. Not yet implemented. */
export function createAddressForm(
  _options: AddressFormOptions,
): AddressFormController {
  throw new Error(
    "createAddressForm: not implemented yet (see .planning/PLAN.md Phase 7)",
  );
}
