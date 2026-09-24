// Headless form state controller. No upstream C++ file ports 1:1 here — the
// closest analog is Java's AddressWidget (not present in this vendored
// submodule snapshot; it lives in the Android client library), and this is
// a from-scratch design following .planning/PLAN.md §5/§6 Phase 7: state as
// plain data, notified via subscribe(), with no rendering and no framework
// dependency (see PLAN.md §7a — React/etc. bindings belong in examples/,
// never here).

import type { AddressData } from "../address-data.js";
import type { AddressField } from "../address-field.js";
import { buildLayout, type AddressLayout, type LayoutField } from "../layout.js";
import { buildRegionTree, type RegionData } from "../region-data.js";
import { normalize } from "../normalizer.js";
import type { PreloadSupplier } from "../supplier/preload.js";
import { validate, type ValidateOptions, type ValidationProblem } from "../validator.js";

// The subset of AddressData fields a form field setter can target — every
// field except `regionCode`, which has its own `setRegion()` because
// changing it reshapes the whole form (layout, region tree, which other
// values survive).
export type FormField = Exclude<keyof AddressData, "regionCode">;

export interface AddressFormState {
  /** Current field values, including `regionCode`. Never mutated in place. */
  values: AddressData;
  /** `null` until a region has been set and its data loaded. */
  layout: AddressLayout | null;
  /**
   * The full admin-area/locality/... tree for the current region, or `null`.
   * Slice into `regionTree.subRegions` (and their own `subRegions`) using
   * the current `values` to get options for a cascading dropdown — the
   * whole tree loads in one call, so no further supplier round-trips are
   * needed as the user picks a narrower level.
   */
  regionTree: RegionData | null;
  problems: ValidationProblem[];
  /** True while a region's data is being loaded (`setRegion` in flight). */
  loading: boolean;
  error: unknown;
  touched: Partial<Record<FormField, boolean>>;
  dirty: boolean;
}

export interface AddressFormOptions {
  /**
   * A `PreloadSupplier` specifically (not the plain `Supplier` interface):
   * building `regionTree` needs `getRulesForRegion`/`isLoaded`, which only
   * `PreloadSupplier` exposes.
   */
  supplier: PreloadSupplier;
  /** BCP-47 UI language tag for labels/region names. Default `"en"`. */
  uiLanguageTag?: string;
  initial?: AddressData;
  /** Passed through to `validate()` on every auto- or manual validation. */
  validateOptions?: ValidateOptions;
  /**
   * Milliseconds to debounce auto-validation after `setField`. `0` disables
   * debouncing (validates on every call, still asynchronously). Default 300.
   */
  debounceMs?: number;
}

export interface AddressFormController {
  getState(): AddressFormState;
  /** Returns an unsubscribe function. The listener also fires once, immediately, on subscribe. */
  subscribe(listener: (state: AddressFormState) => void): () => void;
  setField(field: FormField, value: string | string[] | undefined): void;
  /** Loads the region's data, rebuilds `layout`/`regionTree`, and drops values for fields the new region doesn't use. */
  setRegion(regionCode: string): Promise<void>;
  /** Runs validation immediately (bypassing the debounce) and updates `problems`. */
  validate(): Promise<ValidationProblem[]>;
  /** Converts hierarchical field values (admin area, etc.) to their canonical form, in place in the state. */
  normalizeValues(): void;
  /** Restores `values` to `options.initial` (or an empty address) and re-runs `setRegion` if it has a region code. */
  reset(): void;
}

const EMPTY_ADDRESS: AddressData = { regionCode: "" };

function cloneAddress(address: AddressData): AddressData {
  return { ...address, addressLine: address.addressLine ? [...address.addressLine] : undefined };
}

function usedFields(layout: AddressLayout): Set<AddressField> {
  const fields = new Set<AddressField>();
  for (const row of layout.rows) {
    for (const item of row) {
      if (item.kind === "field") fields.add(item.field);
    }
  }
  return fields;
}

function fieldToValueKey(field: AddressField): keyof AddressData | undefined {
  switch (field) {
    case "ADMIN_AREA":
      return "administrativeArea";
    case "LOCALITY":
      return "locality";
    case "DEPENDENT_LOCALITY":
      return "dependentLocality";
    case "SORTING_CODE":
      return "sortingCode";
    case "POSTAL_CODE":
      return "postalCode";
    case "STREET_ADDRESS":
      return "addressLine";
    case "ORGANIZATION":
      return "organization";
    case "RECIPIENT":
      return "recipient";
    default:
      return undefined; // COUNTRY has its own setRegion().
  }
}

export function createAddressForm(options: AddressFormOptions): AddressFormController {
  const { supplier, uiLanguageTag = "en", validateOptions, debounceMs = 300 } = options;
  const initialAddress = options.initial ?? EMPTY_ADDRESS;

  let state: AddressFormState = {
    values: cloneAddress(initialAddress),
    layout: null,
    regionTree: null,
    problems: [],
    loading: false,
    error: undefined,
    touched: {},
    dirty: false,
  };

  const listeners = new Set<(state: AddressFormState) => void>();
  let debounceHandle: ReturnType<typeof setTimeout> | undefined;
  // Guards against a stale setRegion() call overwriting a newer one's result.
  let regionRequestId = 0;

  function setState(patch: Partial<AddressFormState>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  }

  async function runValidate(): Promise<ValidationProblem[]> {
    if (state.values.regionCode.length === 0) {
      setState({ problems: [] });
      return [];
    }
    const problems = await validate(supplier, state.values, validateOptions);
    setState({ problems });
    return problems;
  }

  function scheduleValidate(): void {
    if (debounceHandle !== undefined) clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => {
      debounceHandle = undefined;
      void runValidate();
    }, debounceMs);
  }

  async function setRegion(regionCode: string): Promise<void> {
    const requestId = ++regionRequestId;
    setState({ loading: true, error: undefined });

    try {
      if (regionCode.length > 0 && !supplier.isLoaded(regionCode)) {
        const result = await supplier.loadRules(regionCode);
        if (requestId !== regionRequestId) return; // superseded by a later call
        if (!result.success) {
          setState({ loading: false, error: new Error(`Failed to load region "${regionCode}"`) });
          return;
        }
      }
      if (requestId !== regionRequestId) return;

      if (regionCode.length === 0) {
        setState({
          values: { regionCode: "" },
          layout: null,
          regionTree: null,
          loading: false,
          problems: [],
        });
        return;
      }

      const layout = buildLayout(regionCode, uiLanguageTag);
      const fields = usedFields(layout);

      // Carry over values for fields the new region still uses; drop the rest.
      const nextValues: AddressData = { regionCode };
      for (const field of fields) {
        const key = fieldToValueKey(field);
        if (key === undefined) continue;
        const prev = state.values[key];
        if (prev !== undefined) (nextValues as unknown as Record<string, unknown>)[key] = prev;
      }

      let regionTree: RegionData | null = null;
      try {
        regionTree = buildRegionTree(supplier, regionCode, uiLanguageTag).tree;
      } catch {
        // No rule for this region despite loadRules() succeeding — leave
        // regionTree null rather than failing the whole setRegion() call.
        regionTree = null;
      }

      setState({ values: nextValues, layout, regionTree, loading: false, problems: [] });
      scheduleValidate();
    } catch (error) {
      if (requestId !== regionRequestId) return;
      setState({ loading: false, error });
    }
  }

  return {
    getState(): AddressFormState {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },

    setField(field, value) {
      const key: keyof AddressData = field;
      const nextValues = { ...state.values, [key]: value } as AddressData;
      setState({
        values: nextValues,
        touched: { ...state.touched, [field]: true },
        dirty: true,
      });
      scheduleValidate();
    },

    setRegion,

    async validate() {
      if (debounceHandle !== undefined) {
        clearTimeout(debounceHandle);
        debounceHandle = undefined;
      }
      return runValidate();
    },

    normalizeValues() {
      if (state.values.regionCode.length === 0 || !supplier.isLoaded(state.values.regionCode)) {
        return;
      }
      setState({ values: normalize(supplier, state.values) });
    },

    reset() {
      if (debounceHandle !== undefined) {
        clearTimeout(debounceHandle);
        debounceHandle = undefined;
      }
      regionRequestId++; // cancel any in-flight setRegion
      const values = cloneAddress(initialAddress);
      setState({
        values,
        layout: null,
        regionTree: null,
        problems: [],
        loading: false,
        error: undefined,
        touched: {},
        dirty: false,
      });
      if (values.regionCode.length > 0) {
        void setRegion(values.regionCode);
      }
    },
  };
}

export type { LayoutField };
