// This hook is intentionally NOT part of @piplup/libaddressinput — the
// library has no React dependency (see .planning/PLAN.md §7a). Copy this
// file into your own project; it's ~20 lines wiring React's
// useSyncExternalStore to createAddressForm()'s subscribe/getState contract.

import { useMemo, useSyncExternalStore } from "react";
import {
  createAddressForm,
  type AddressFormController,
  type AddressFormOptions,
  type AddressFormState,
} from "@piplup/libaddressinput";

export function useAddressForm(
  options: AddressFormOptions,
): [AddressFormState, AddressFormController] {
  // Recreated only when the supplier identity changes — pass a stable
  // supplier instance (e.g. from useMemo/useState/module scope) to avoid
  // reloading region data on every render.
  const form = useMemo(() => createAddressForm(options), [options.supplier]);

  const state = useSyncExternalStore(form.subscribe, form.getState);

  return [state, form];
}
