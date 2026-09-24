// Country switcher with cascading admin-area/locality selects (sliced from
// createAddressForm()'s `regionTree`), and per-field validation errors —
// all driven by the copy-paste useAddressForm hook in useAddressForm.ts.

import { useState } from "react";
import {
  FetchSource,
  MemoryStorage,
  PreloadSupplier,
  getRegionCodes,
  type LayoutField,
  type RegionData,
} from "@piplup/libaddressinput";
import { en } from "@piplup/libaddressinput/messages/en";
import { useAddressForm } from "./useAddressForm.js";

const supplier = new PreloadSupplier(new FetchSource(), new MemoryStorage());

const FIELD_KEYS: Record<string, "administrativeArea" | "locality" | "dependentLocality" | "sortingCode" | "postalCode" | "organization" | "recipient" | undefined> = {
  ADMIN_AREA: "administrativeArea",
  LOCALITY: "locality",
  DEPENDENT_LOCALITY: "dependentLocality",
  SORTING_CODE: "sortingCode",
  POSTAL_CODE: "postalCode",
  ORGANIZATION: "organization",
  RECIPIENT: "recipient",
};

function labelText(field: LayoutField): string {
  if (field.labelId === "CEDEX") return "CEDEX";
  if (field.labelId === undefined) return field.field;
  return en[field.labelId];
}

function findChildren(tree: RegionData | null, key: string | undefined): RegionData[] {
  if (tree === null || key === undefined) return [];
  const match = tree.subRegions.find((r) => r.key === key || r.name === key);
  return match?.subRegions ?? [];
}

export function App() {
  const [regionCode, setRegionCode] = useState("US");
  const [state, form] = useAddressForm({ supplier, initial: { regionCode } });

  const errorsFor = (field: string) =>
    state.problems.filter((p) => p.field === field).map((p) => p.problem);

  return (
    <main style={{ maxWidth: "32rem", margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Address form (react-form-controller)</h1>

      <label>
        Region
        <select
          value={regionCode}
          onChange={(e) => {
            setRegionCode(e.target.value);
            void form.setRegion(e.target.value);
          }}
          style={{ display: "block", width: "100%" }}
        >
          {getRegionCodes().map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      {state.loading && <p>Loading region data…</p>}

      {state.layout?.rows.flat().map((item) => {
        if (item.kind !== "field") return null;

        const cascadeKey = FIELD_KEYS[item.field];
        const options =
          item.field === "ADMIN_AREA"
            ? (state.regionTree?.subRegions ?? [])
            : item.field === "LOCALITY"
              ? findChildren(state.regionTree, state.values.administrativeArea)
              : undefined;

        return (
          <label key={item.field} style={{ display: "block", marginTop: "0.75rem" }}>
            {labelText(item)}
            {item.required ? " *" : ""}
            {options !== undefined && options.length > 0 ? (
              <select
                value={cascadeKey ? ((state.values[cascadeKey] as string) ?? "") : ""}
                onChange={(e) => cascadeKey && form.setField(cascadeKey, e.target.value)}
                style={{ display: "block", width: "100%" }}
              >
                <option value="" />
                {options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                style={{ display: "block", width: "100%", boxSizing: "border-box" }}
                onChange={(e) => {
                  if (item.field === "STREET_ADDRESS") {
                    form.setField("addressLine", [e.target.value]);
                  } else if (cascadeKey !== undefined) {
                    form.setField(cascadeKey, e.target.value);
                  }
                }}
              />
            )}
            {errorsFor(item.field).map((problem) => (
              <div key={problem} style={{ color: "#b00020", fontSize: "0.85em" }}>
                {problem}
              </div>
            ))}
          </label>
        );
      })}

      <button type="button" onClick={() => void form.validate()} style={{ marginTop: "1rem" }}>
        Validate now
      </button>
    </main>
  );
}
