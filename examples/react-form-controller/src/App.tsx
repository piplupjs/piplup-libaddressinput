// Country switcher with cascading admin-area/locality selects (sliced from
// createAddressForm()'s `regionTree`), and per-field validation errors —
// all driven by the copy-paste useAddressForm hook in useAddressForm.ts.

import { useState } from "react";
import {
  HybridSource,
  MemoryStorage,
  PreloadSupplier,
  getRegionOptions,
  getFieldLabel,
  getFieldKey,
  getFieldAutocomplete,
  formatRegionOption,
  findSubRegions,
  getProblemErrorMessage,
} from "@piplup/libaddressinput";
import { useAddressForm } from "./useAddressForm.js";

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());
const REGION_OPTIONS = getRegionOptions("en");

export function App() {
  const [regionCode, setRegionCode] = useState("US");
  const [state, form] = useAddressForm({ supplier, initial: { regionCode } });

  const errorsFor = (field: string) =>
    state.userProblems
      .filter((p) => p.field === field)
      .map((p) => getProblemErrorMessage(p));

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
          style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        >
          {REGION_OPTIONS.map(({ code, name }) => (
            <option key={code} value={code}>
              {name} ({code})
            </option>
          ))}
        </select>
      </label>

      {state.loading && <p>Loading region data…</p>}

      {state.layout?.rows.flat().map((item) => {
        if (item.kind !== "field" || item.field === "COUNTRY") return null;

        const key = getFieldKey(item.field);
        const options =
          item.field === "ADMIN_AREA"
            ? (state.regionTree?.subRegions ?? [])
            : item.field === "LOCALITY"
              ? findSubRegions(state.regionTree, state.values.administrativeArea)
              : undefined;

        return (
          <label key={item.field} style={{ display: "block", marginTop: "0.75rem" }}>
            {getFieldLabel(item)}
            {item.required ? " *" : ""}
            {options !== undefined && options.length > 0 ? (
              <select
                value={typeof state.values[key] === "string" ? (state.values[key] as string) : ""}
                onChange={(e) => form.setField(item.field, e.target.value)}
                style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
              >
                <option value="">Select {getFieldLabel(item)}…</option>
                {options.map((option) => (
                  <option key={option.key} value={option.key}>
                    {formatRegionOption(option)}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                autoComplete={getFieldAutocomplete(item.field)}
                value={
                  Array.isArray(state.values[key])
                    ? ((state.values[key] as string[])[0] ?? "")
                    : ((state.values[key] as string) ?? "")
                }
                style={{
                  display: "block",
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.5rem",
                  marginTop: "0.25rem",
                }}
                onChange={(e) => {
                  form.setField(
                    item.field,
                    item.field === "STREET_ADDRESS" ? [e.target.value] : e.target.value,
                  );
                }}
              />
            )}
            {errorsFor(item.field).map((msg, i) => (
              <div key={i} style={{ color: "#b00020", fontSize: "0.85em", marginTop: "0.25rem" }}>
                {msg}
              </div>
            ))}
          </label>
        );
      })}

      <button
        type="button"
        onClick={() => void form.validate()}
        style={{
          marginTop: "1.25rem",
          padding: "0.6rem 1.25rem",
          background: "#0052cc",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Validate now
      </button>

      {state.isValid && state.values.regionCode && !state.loading && (
        <div style={{ marginTop: "1rem", color: "#006644", fontWeight: 600 }}>
          {state.dirty ? "✓ Form is valid" : ""}
        </div>
      )}
    </main>
  );
}
