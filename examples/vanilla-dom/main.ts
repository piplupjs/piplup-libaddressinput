// Renders buildLayout() output as a plain HTML form. Demonstrates using
// @piplup/libaddressinput with no framework — every DOM read/write here is
// hand-written; the library never touches the DOM itself (see PLAN.md §1).

import {
  FallbackAggregateSource,
  FetchSource,
  MemoryStorage,
  PreloadSupplier,
  buildLayout,
  getRegionCodes,
  validate,
  type AddressData,
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
const result = document.querySelector<HTMLPreElement>("#result")!;

let values: AddressData = { regionCode: "" };

// Message ids resolve to English text via a plain lookup table — a
// consumer with their own translations would swap this one function.
function labelText(field: LayoutField): string {
  if (field.labelId === "CEDEX") return "CEDEX";
  if (field.labelId === undefined) return field.field;
  return en[field.labelId];
}

for (const code of getRegionCodes()) {
  const option = document.createElement("option");
  option.value = code;
  option.textContent = code;
  regionSelect.appendChild(option);
}
regionSelect.value = "US";

function fieldKey(field: LayoutField["field"]): keyof AddressData {
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
    for (const item of row) {
      if (item.kind !== "field") continue;
      const key = fieldKey(item.field);
      if (key === "regionCode") continue;

      const label = document.createElement("label");
      label.textContent = labelText(item) + (item.required ? " *" : "");
      label.htmlFor = `field-${item.field}`;

      const input = document.createElement("input");
      input.id = `field-${item.field}`;
      input.type = "text";
      const current = values[key];
      input.value = Array.isArray(current) ? (current[0] ?? "") : (current ?? "");
      input.addEventListener("input", () => {
        values = { ...values, [key]: item.field === "STREET_ADDRESS" ? [input.value] : input.value };
      });

      fieldsForm.appendChild(label);
      fieldsForm.appendChild(input);
    }
  }
}

async function loadRegion(regionCode: string): Promise<void> {
  values = { regionCode };
  // buildLayout() only requires bundled metadata — render the form layout immediately!
  renderFields();

  result.textContent = "Loading validation rules…";
  const loaded = await supplier.loadRules(regionCode);
  if (!loaded.success) {
    result.textContent = `Failed to load validation rules for ${regionCode}.`;
    return;
  }
  result.textContent = "";
}

regionSelect.addEventListener("change", () => {
  void loadRegion(regionSelect.value);
});

validateButton.addEventListener("click", () => {
  void (async () => {
    if (!supplier.isLoaded(values.regionCode)) {
      result.textContent = `Validation rules for ${values.regionCode} are not loaded.`;
      return;
    }
    const problems = await validate(supplier, values);
    if (problems.length === 0) {
      result.textContent = "✓ No problems found.";
      return;
    }
    // For a real "You can't leave this empty."-style message per problem,
    // resolve each with getProblemMessage()/formatMessage() (see
    // messages.ts) — this demo just shows the raw field/problem pairs.
    result.textContent = problems.map((p) => `${p.field}: ${p.problem}`).join("\n");
  })();
});

void loadRegion(regionSelect.value);
