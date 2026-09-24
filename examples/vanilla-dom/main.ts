// Renders buildLayout() output as a plain HTML form. Demonstrates using
// @piplup/libaddressinput with no framework — powered by the headless
// createAddressForm() controller and UI helpers.

import {
  HybridSource,
  MemoryStorage,
  PreloadSupplier,
  createAddressForm,
  getRegionOptions,
  getFieldLabel,
  getFieldKey,
  getFieldAutocomplete,
  formatRegionOption,
  getProblemErrorMessage,
} from "@piplup/libaddressinput";

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());
const form = createAddressForm({ supplier, initial: { regionCode: "US" } });

const regionSelect = document.querySelector<HTMLSelectElement>("#region")!;
const fieldsForm = document.querySelector<HTMLFormElement>("#fields")!;
const validateButton = document.querySelector<HTMLButtonElement>("#validate")!;
const result = document.querySelector<HTMLDivElement>("#result")!;

// Populate country dropdown with localized names sorted alphabetically
for (const { code, name } of getRegionOptions("en")) {
  const opt = document.createElement("option");
  opt.value = code;
  opt.textContent = `${name} (${code})`;
  regionSelect.appendChild(opt);
}
regionSelect.value = "US";

regionSelect.addEventListener("change", () => {
  result.className = "";
  result.textContent = "";
  void form.setRegion(regionSelect.value);
});

validateButton.addEventListener("click", () => {
  void (async () => {
    result.className = "";
    result.textContent = "";

    await form.validate();
    const state = form.getState();

    if (state.isValid) {
      result.className = "success";
      result.textContent = "✓ Address is valid!";
    } else {
      result.className = "has-errors";
      result.textContent = `Found ${state.userProblems.length} problem(s). Please correct the highlighted fields.`;
    }
  })();
});

let currentRenderedRegion = "";

form.subscribe((state) => {
  const { layout, values, userProblems } = state;
  if (!layout) return;

  // Only re-build DOM structure when the country/region changes
  const regionChanged = currentRenderedRegion !== values.regionCode;
  if (regionChanged) {
    currentRenderedRegion = values.regionCode;
    fieldsForm.replaceChildren();

    for (const row of layout.rows) {
      const rowDiv = document.createElement("div");
      rowDiv.className = "row";

      for (const item of row) {
        if (item.kind !== "field") continue;
        const key = getFieldKey(item.field);
        if (key === "regionCode") continue;

        const colDiv = document.createElement("div");
        const label = document.createElement("label");
        label.textContent = getFieldLabel(item) + (item.required ? " *" : "");
        label.htmlFor = `field-${item.field}`;
        colDiv.appendChild(label);

        // If this field is ADMIN_AREA and sub-region options exist (e.g. US States), render a <select>
        const subRegions = item.field === "ADMIN_AREA" ? form.getSubRegions() : [];
        if (subRegions.length > 0) {
          const select = document.createElement("select");
          select.id = `field-${item.field}`;
          select.append(new Option(`Select ${getFieldLabel(item)}…`, ""));
          for (const sub of subRegions) {
            select.append(new Option(formatRegionOption(sub), sub.key));
          }
          const current = values[key];
          select.value = typeof current === "string" ? current : "";
          select.addEventListener("change", () => {
            form.setField(item.field, select.value);
          });
          colDiv.appendChild(select);
        } else {
          const input = document.createElement("input");
          input.id = `field-${item.field}`;
          input.type = "text";
          input.setAttribute("autocomplete", getFieldAutocomplete(item.field));
          const current = values[key];
          input.value = Array.isArray(current) ? (current[0] ?? "") : (current ?? "");
          input.addEventListener("input", () => {
            form.setField(
              item.field,
              item.field === "STREET_ADDRESS" ? [input.value] : input.value,
            );
          });
          colDiv.appendChild(input);
        }

        const errorDiv = document.createElement("div");
        errorDiv.className = "error";
        errorDiv.id = `error-${item.field}`;
        colDiv.appendChild(errorDiv);

        rowDiv.appendChild(colDiv);
      }
      fieldsForm.appendChild(rowDiv);
    }
  }

  // Reactively sync validation error messages and error styles
  for (const row of layout.rows) {
    for (const item of row) {
      if (item.kind !== "field") continue;
      const errorEl = document.querySelector<HTMLDivElement>(`#error-${item.field}`);
      const inputEl = document.querySelector<HTMLElement>(`#field-${item.field}`);
      const problem = userProblems.find((p) => p.field === item.field);

      if (errorEl) {
        errorEl.textContent = problem ? getProblemErrorMessage(problem) : "";
      }
      if (inputEl) {
        inputEl.classList.toggle("input-error", Boolean(problem));
      }
    }
  }
});

void form.setRegion("US");
