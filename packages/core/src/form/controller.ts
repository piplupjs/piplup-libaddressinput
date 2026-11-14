// Headless form state controller. No upstream C++ file ports 1:1 here — the
// closest analog is Java's AddressWidget (not present in this vendored
// submodule snapshot; it lives in the Android client library), and this is
// a from-scratch design following .planning/PLAN.md §5/§6 Phase 7: state as
// plain data, notified via subscribe(), with no rendering and no framework
// dependency (see PLAN.md §7a — React/etc. bindings belong in examples/,
// never here).

import { buildLayout } from '../layout.js';
import { normalize } from '../normalizer.js';
import { buildRegionTree } from '../region-data.js';
import { getUserProblems } from '../ui/problems.js';
import { findSubRegions } from '../ui/regions.js';
import { validate } from '../validator.js';

import type { AddressData } from '../address-data.js';
import type { AddressField } from '../address-field.js';
import type { AddressLayout, LayoutField } from '../layout.js';
import type { RegionData } from '../region-data.js';
import type { PreloadSupplier } from '../supplier/preload.js';
import type { ValidateOptions, ValidationProblem } from '../validator.js';

// The subset of AddressData fields a form field setter can target — every
// field except `regionCode`, which has its own `setRegion()` because
// changing it reshapes the whole form (layout, region tree, which other
// values survive).
export type FormField = Exclude<keyof AddressData, 'regionCode'>;

export interface AddressFormState {
  dirty: boolean;
  error: unknown;
  /** True when userProblems is empty. */
  isValid: boolean;
  /** `null` until a region has been set and its data loaded. */
  layout: AddressLayout | null;
  /** True while a region's data is being loaded (`setRegion` in flight). */
  loading: boolean;
  problems: ValidationProblem[];
  /**
   * The full admin-area/locality/... tree for the current region, or `null`.
   * Slice into `regionTree.subRegions` (and their own `subRegions`) using
   * the current `values` to get options for a cascading dropdown — the
   * whole tree loads in one call, so no further supplier round-trips are
   * needed as the user picks a narrower level.
   */
  regionTree: null | RegionData;
  touched: Partial<Record<FormField, boolean>>;
  /** Filtered list of problems containing only user-actionable errors (excludes UNSUPPORTED_FIELD). */
  userProblems: ValidationProblem[];
  /** Current field values, including `regionCode`. Never mutated in place. */
  values: AddressData;
}

export interface AddressFormOptions {
  initial?: AddressData;
  /**
   * A `PreloadSupplier` specifically (not the plain `Supplier` interface):
   * building `regionTree` needs `getRulesForRegion`/`isLoaded`, which only
   * `PreloadSupplier` exposes.
   */
  supplier: PreloadSupplier;
  /** BCP-47 UI language tag for labels/region names. Default `"en"`. */
  uiLanguageTag?: string;
  /** Passed through to `validate()` on every manual validation call. */
  validateOptions?: ValidateOptions;
}

export interface AddressFormController {
  /** Cleanup pending timers and listeners. Automatically called by reset(); use explicitly when discarding the form without reset(). */
  dispose(): void;
  getState(): AddressFormState;
  /** Returns subregions from the current region tree, optionally filtered by parent key/name. */
  getSubRegions(parentKeyOrName?: string): RegionData[];
  /** Converts hierarchical field values (admin area, etc.) to their canonical form, in place in the state. */
  normalizeValues(): void;
  /** Restores `values` to `options.initial` (or an empty address) and re-runs `setRegion` if it has a region code. */
  reset(): void;
  /** Sets a field value by FormField (e.g. "locality") or AddressField (e.g. "LOCALITY"). */
  setField(field: AddressField | FormField, value: string | string[] | undefined): void;
  /** Loads the region's data, rebuilds `layout`/`regionTree`, and drops values for fields the new region doesn't use. */
  setRegion(regionCode: string): Promise<void>;
  /** Returns an unsubscribe function. The listener also fires once, immediately, on subscribe. */
  subscribe(listener: (state: AddressFormState) => void): () => void;
  /** Runs validation immediately (bypassing the debounce) and updates `problems` and `userProblems`. */
  validate(): Promise<ValidationProblem[]>;
}

const EMPTY_ADDRESS: AddressData = { regionCode: '' };

function cloneAddress(address: AddressData): AddressData {
  return {
    ...address,
    addressLine: address.addressLine ? [...address.addressLine] : undefined,
  };
}

function usedFields(layout: AddressLayout): Set<AddressField> {
  const fields = new Set<AddressField>();
  for (const row of layout.rows) {
    for (const item of row) {
      if (item.kind === 'field') {
        fields.add(item.field);
      }
    }
  }
  return fields;
}

function fieldToValueKey(field: AddressField): keyof AddressData | undefined {
  switch (field) {
    case 'ADMIN_AREA':
      return 'administrativeArea';
    case 'LOCALITY':
      return 'locality';
    case 'DEPENDENT_LOCALITY':
      return 'dependentLocality';
    case 'SORTING_CODE':
      return 'sortingCode';
    case 'POSTAL_CODE':
      return 'postalCode';
    case 'STREET_ADDRESS':
      return 'addressLine';
    case 'ORGANIZATION':
      return 'organization';
    case 'RECIPIENT':
      return 'recipient';
    default:
      return undefined; // COUNTRY has its own setRegion().
  }
}

export function createAddressForm(options: AddressFormOptions): AddressFormController {
  const { supplier, uiLanguageTag = 'en', validateOptions } = options;
  const initialAddress = options.initial ?? EMPTY_ADDRESS;

  let state: AddressFormState = {
    dirty: false,
    error: undefined,
    isValid: true,
    layout: null,
    loading: false,
    problems: [],
    regionTree: null,
    touched: {},
    userProblems: [],
    values: cloneAddress(initialAddress),
  };

  const listeners = new Set<(state: AddressFormState) => void>();
  // Guards against a stale setRegion() call overwriting a newer one's result.
  let regionRequestId = 0;

  function setState(patch: Partial<AddressFormState>): void {
    state = { ...state, ...patch };
    for (const listener of listeners) {
      listener(state);
    }
  }

  async function runValidate(): Promise<ValidationProblem[]> {
    if (state.values.regionCode.length === 0) {
      setState({ isValid: true, problems: [], userProblems: [] });
      return [];
    }
    const problems = await validate(supplier, state.values, validateOptions);
    const userProblems = getUserProblems(problems);
    setState({ isValid: userProblems.length === 0, problems, userProblems });
    return problems;
  }

  async function setRegion(regionCode: string): Promise<void> {
    regionRequestId += 1;
    const requestId = regionRequestId;
    setState({ error: undefined, loading: true });

    try {
      if (regionCode.length > 0 && !supplier.isLoaded(regionCode)) {
        const result = await supplier.loadRules(regionCode);
        if (requestId !== regionRequestId) {
          return;
        } // superseded by a later call
        if (!result.success) {
          setState({
            error: new Error(`Failed to load region "${regionCode}"`),
            loading: false,
          });
          return;
        }
      }
      if (requestId !== regionRequestId) {
        return;
      }

      if (regionCode.length === 0) {
        setState({
          isValid: true,
          layout: null,
          loading: false,
          problems: [],
          regionTree: null,
          userProblems: [],
          values: { regionCode: '' },
        });
        return;
      }

      const layout = buildLayout(regionCode, uiLanguageTag);
      const fields = usedFields(layout);

      // Carry over values for fields the new region still uses; drop the rest.
      const nextValues: AddressData = { regionCode };
      for (const field of fields) {
        const key = fieldToValueKey(field);
        if (key === undefined) {
          continue;
        }
        const prev = state.values[key];
        if (prev !== undefined) {
          Object.assign(nextValues, { [key]: prev });
        }
      }

      let regionTree: null | RegionData = null;
      try {
        regionTree = buildRegionTree(supplier, regionCode, uiLanguageTag).tree;
      } catch {
        // No rule for this region despite loadRules() succeeding — leave
        // regionTree null rather than failing the whole setRegion() call.
        regionTree = null;
      }

      setState({
        isValid: true,
        layout,
        loading: false,
        problems: [],
        regionTree,
        userProblems: [],
        values: nextValues,
      });
    } catch (error) {
      if (requestId !== regionRequestId) {
        return;
      }
      setState({ error, loading: false });
    }
  }

  return {
    dispose() {
      listeners.clear();
      regionRequestId += 1;
    },

    getState(): AddressFormState {
      return state;
    },

    getSubRegions(parentKeyOrName?: string) {
      if (state.regionTree === null) {
        return [];
      }
      if (parentKeyOrName === undefined || parentKeyOrName === '') {
        return state.regionTree.subRegions;
      }
      return findSubRegions(state.regionTree, parentKeyOrName);
    },

    normalizeValues() {
      if (state.values.regionCode.length === 0 || !supplier.isLoaded(state.values.regionCode)) {
        return;
      }
      setState({ values: normalize(supplier, state.values) });
    },

    reset() {
      this.dispose();
      const values = cloneAddress(initialAddress);
      setState({
        dirty: false,
        error: undefined,
        isValid: true,
        layout: null,
        loading: false,
        problems: [],
        regionTree: null,
        touched: {},
        userProblems: [],
        values,
      });
      if (values.regionCode.length > 0) {
        void setRegion(values.regionCode);
      }
    },

    setField(field, value) {
      const resolvedKey: FormField | undefined =
        typeof field === 'string' && fieldToValueKey(field as AddressField) !== undefined
          ? (fieldToValueKey(field as AddressField) as FormField)
          : (field as FormField);

      if (resolvedKey === undefined) {
        return;
      }

      const nextValues = { ...state.values, [resolvedKey]: value } as AddressData;
      setState({
        dirty: true,
        touched: { ...state.touched, [resolvedKey]: true },
        values: nextValues,
      });
    },

    setRegion,

    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },

    async validate() {
      return runValidate();
    },
  };
}

export type { LayoutField };
