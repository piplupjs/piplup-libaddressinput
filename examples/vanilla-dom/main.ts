// Renders buildLayout() output as a plain HTML form. Demonstrates using
// @piplup/libaddressinput with no framework — every DOM read/write here is
// hand-written; the library never touches the DOM itself (see PLAN.md §1).

import {
  FallbackAggregateSource,
  FetchSource,
  MemoryStorage,
  PreloadSupplier,
  buildLayout,
  buildRegionTree,
  getRegionCodes,
  validate,
  type AddressData,
  type AddressField,
  type LayoutField,
  type Source,
  type SourceResult,
} from "@piplup/libaddressinput";
import { en } from "@piplup/libaddressinput/messages/en";

// Try live network first, fall back to bundled offline data if offline or unreachable.
class NetworkWithOfflineFallbackSource implements Source {
  constructor(
    private readonly remote = new FetchSource(),
    private readonly offline = new FallbackAggregateSource(),
  ) {}

  async get(key: string): Promise<SourceResult> {
    const remoteResult = await this.remote.get(key);
    if (remoteResult.success && remoteResult.data !== undefined) {
      return remoteResult;
    }
    return this.offline.get(key);
  }
}

const supplier = new PreloadSupplier(
  new NetworkWithOfflineFallbackSource(),
  new MemoryStorage(),
);

const regionSelect = document.querySelector<HTMLSelectElement>("#region")!;
const fieldsForm = document.querySelector<HTMLFormElement>("#fields")!;
const validateButton = document.querySelector<HTMLButtonElement>("#validate")!;
const result = document.querySelector<HTMLDivElement>("#result")!;

let values: AddressData = { regionCode: "" };
let subRegionOptions: Array<{ key: string; name: string }> = [];

// Friendly fallbacks for fields that don't define a region-specific name type
// (upstream resolves these to INVALID_MESSAGE_ID when the default English label applies).
const DEFAULT_LABELS: Record<string, string> = {
  LOCALITY: "City",
  ADMIN_AREA: "State / Province",
  DEPENDENT_LOCALITY: "District / Suburb",
  POSTAL_CODE: "Postal code",
  STREET_ADDRESS: "Street address",
  ORGANIZATION: "Organization",
  RECIPIENT: "Full name",
  SORTING_CODE: "Sorting code",
  COUNTRY: "Country / Region",
};

function labelText(field: LayoutField): string {
  if (field.labelId === "CEDEX") return "CEDEX";
  if (field.labelId !== undefined && en[field.labelId] !== undefined) {
    return en[field.labelId];
  }
  return DEFAULT_LABELS[field.field] ?? field.field;
}

// Populate regions dropdown with localized country names where available.
const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
for (const code of getRegionCodes()) {
  const option = document.createElement("option");
  option.value = code;
  let label = code;
  try {
    const fullName = displayNames.of(code);
    if (fullName) label = `${fullName} (${code})`;
  } catch {
    // Ignore unsupported codes
  }
  option.textContent = label;
  regionSelect.appendChild(option);
}
regionSelect.value = "US";

function fieldKey(field: AddressField): keyof AddressData {
  const map: Record<string, keyof AddressData> = {
    ADMIN_AREA: "administrativeArea",
    LOCALITY: "locality",
    DEPENDENT_LOCALITY: "dependentLocality",
    SORTING_CODE: "sortingCode",
    POSTAL_CODE: "postalCode",
    STREET_ADDRESS: "addressLine",
    ORGANIZATION: "organization",
    RECIPIENT: "recipient",
  };
  return map[field] ?? "regionCode";
}

function renderFields(): void {
  fieldsForm.replaceChildren();
  const layout = buildLayout(values.regionCode, "en");

  for (const row of layout.rows) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    let fieldCount = 0;

    for (const item of row) {
      if (item.kind !== "field") continue;
      const key = fieldKey(item.field);
      if (key === "regionCode") continue;
      fieldCount++;

      const colDiv = document.createElement("div");

      const label = document.createElement("label");
      label.textContent = labelText(item) + (item.required ? " *" : "");
      label.htmlFor = `field-${item.field}`;
      colDiv.appendChild(label);

      // If this is the ADMIN_AREA and sub-region options exist (e.g. US states), render a <select>.
      if (item.field === "ADMIN_AREA" && subRegionOptions.length > 0) {
        const select = document.createElement("select");
        select.id = `field-${item.field}`;

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = `Select ${labelText(item)}…`;
        select.appendChild(defaultOption);

        for (const sub of subRegionOptions) {
          const opt = document.createElement("option");
          opt.value = sub.key;
          opt.textContent =
            sub.name && sub.name !== sub.key
              ? `${sub.name} (${sub.key})`
              : (sub.name || sub.key);
          select.appendChild(opt);
        }

        const current = values[key];
        select.value = typeof current === "string" ? current : "";
        select.addEventListener("change", () => {
          values = { ...values, [key]: select.value };
          select.classList.remove("input-error");
          const errEl = document.querySelector<HTMLDivElement>(`#error-${item.field}`);
          if (errEl) errEl.textContent = "";
        });

        colDiv.appendChild(select);
      } else {
        const input = document.createElement("input");
        input.id = `field-${item.field}`;
        input.type = "text";
        const current = values[key];
        input.value = Array.isArray(current) ? (current[0] ?? "") : (current ?? "");
        input.addEventListener("input", () => {
          values = {
            ...values,
            [key]: item.field === "STREET_ADDRESS" ? [input.value] : input.value,
          };
          input.classList.remove("input-error");
          const errEl = document.querySelector<HTMLDivElement>(`#error-${item.field}`);
          if (errEl) errEl.textContent = "";
        });

        colDiv.appendChild(input);
      }

      const errorDiv = document.createElement("div");
      errorDiv.className = "error";
      errorDiv.id = `error-${item.field}`;
      colDiv.appendChild(errorDiv);

      rowDiv.appendChild(colDiv);
    }

    if (fieldCount > 0) {
      fieldsForm.appendChild(rowDiv);
    }
  }
}

async function loadRegion(regionCode: string): Promise<void> {
  values = { regionCode };
  subRegionOptions = [];
  // buildLayout() only requires bundled metadata — render the form layout immediately!
  renderFields();

  result.className = "";
  result.textContent = "";

  const loaded = await supplier.loadRules(regionCode);
  if (!loaded.success) {
    result.className = "has-errors";
    result.textContent = `Note: Remote validation rules could not be loaded for ${regionCode}. Using offline fallback rules.`;
    return;
  }

  // Populate sub-region dropdowns (e.g. US States, Canadian Provinces, etc.)
  try {
    const treeResult = buildRegionTree(supplier, regionCode, "en");
    if (treeResult.tree.subRegions.length > 0) {
      subRegionOptions = treeResult.tree.subRegions.map((r) => ({
        key: r.key,
        name: r.name,
      }));
      renderFields();
    }
  } catch {
    // If no region tree is available, keep standard text inputs
  }
}

regionSelect.addEventListener("change", () => {
  void loadRegion(regionSelect.value);
});

validateButton.addEventListener("click", () => {
  void (async () => {
    // Clear previous errors
    fieldsForm.querySelectorAll<HTMLDivElement>(".error").forEach((el) => {
      el.textContent = "";
    });
    fieldsForm.querySelectorAll<HTMLElement>(".input-error").forEach((el) => {
      el.classList.remove("input-error");
    });
    result.className = "";
    result.textContent = "";

    if (!supplier.isLoaded(values.regionCode)) {
      result.className = "has-errors";
      result.textContent = `Validation rules for ${values.regionCode} are not loaded.`;
      return;
    }

    const rawProblems = await validate(supplier, values);
    // UNSUPPORTED_FIELD is an internal metadata flag from upstream libaddressinput
    // indicating no sub-key validation rules exist at that depth (e.g. city in IN or US),
    // NOT a user validation error.
    const problems = rawProblems.filter((p) => p.problem !== "UNSUPPORTED_FIELD");
    if (problems.length === 0) {
      result.className = "success";
      result.textContent = "✓ Address is valid!";
      return;
    }

    result.className = "has-errors";
    result.textContent = `Found ${problems.length} problem(s). Please correct the highlighted fields.`;

    for (const p of problems) {
      const errEl = document.querySelector<HTMLDivElement>(`#error-${p.field}`);
      const inputEl = document.querySelector<HTMLInputElement | HTMLSelectElement>(
        `#field-${p.field}`,
      );
      if (inputEl) {
        inputEl.classList.add("input-error");
      }
      if (errEl) {
        const msg =
          p.problem === "MISSING_REQUIRED_FIELD"
            ? "You can't leave this empty."
            : p.problem === "INVALID_FORMAT"
              ? "Invalid format for this field."
              : p.problem === "UNKNOWN_VALUE"
                ? "This value is not recognized."
                : p.problem === "MISMATCHING_VALUE"
                  ? "This value does not match the surrounding region."
                  : p.problem === "UNEXPECTED_FIELD"
                    ? "This field is not expected for this region."
                    : p.problem === "USES_P_O_BOX"
                      ? "P.O. boxes are not allowed here."
                      : p.problem;
        errEl.textContent = msg;
      }
    }
  })();
});

void loadRegion(regionSelect.value);
