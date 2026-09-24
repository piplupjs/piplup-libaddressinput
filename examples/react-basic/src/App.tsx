// A stateless-integration example: plain React `useState`, calling
// buildLayout() and validate() directly — no custom hook, no
// createAddressForm(). Shows the smallest possible integration.

import { useEffect, useMemo, useState } from "react";
import {
  HybridSource,
  MemoryStorage,
  PreloadSupplier,
  buildLayout,
  getRegionOptions,
  getFieldLabel,
  getFieldKey,
  getFieldAutocomplete,
  getUserProblems,
  getProblemErrorMessage,
  validate,
  type AddressData,
  type LayoutField,
  type ValidationProblem,
} from "@piplup/libaddressinput";

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());
const REGION_OPTIONS = getRegionOptions("en");

export function App() {
  const [values, setValues] = useState<AddressData>({ regionCode: "US" });
  const [loaded, setLoaded] = useState(false);
  const [problems, setProblems] = useState<ValidationProblem[]>([]);

  useEffect(() => {
    setLoaded(false);
    let cancelled = false;
    void supplier.loadRules(values.regionCode).then((result) => {
      if (!cancelled) setLoaded(result.success);
    });
    return () => {
      cancelled = true;
    };
  }, [values.regionCode]);

  const layout = useMemo(
    () => buildLayout(values.regionCode, "en"),
    [values.regionCode],
  );

  function setField(field: LayoutField["field"], value: string): void {
    const key = getFieldKey(field);
    if (key === "regionCode") return;
    setValues((prev) => ({
      ...prev,
      [key]: field === "STREET_ADDRESS" ? [value] : value,
    }));
  }

  async function onValidate(): Promise<void> {
    const raw = await validate(supplier, values);
    setProblems(getUserProblems(raw));
  }

  return (
    <main style={{ maxWidth: "32rem", margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Address form (react-basic)</h1>
      <label>
        Region
        <select
          value={values.regionCode}
          onChange={(e) => setValues({ regionCode: e.target.value })}
          style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        >
          {REGION_OPTIONS.map(({ code, name }) => (
            <option key={code} value={code}>
              {name} ({code})
            </option>
          ))}
        </select>
      </label>

      {layout?.rows.flat().map((item) =>
        item.kind === "field" && item.field !== "COUNTRY" ? (
          <label key={item.field} style={{ display: "block", marginTop: "0.75rem" }}>
            {getFieldLabel(item)}
            {item.required ? " *" : ""}
            <input
              type="text"
              autoComplete={getFieldAutocomplete(item.field)}
              style={{
                display: "block",
                width: "100%",
                boxSizing: "border-box",
                padding: "0.5rem",
                marginTop: "0.25rem",
              }}
              onChange={(e) => setField(item.field, e.target.value)}
            />
          </label>
        ) : null,
      )}

      <button
        type="button"
        onClick={() => void onValidate()}
        disabled={!loaded}
        style={{
          marginTop: "1.25rem",
          padding: "0.6rem 1.25rem",
          background: "#0052cc",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontWeight: 600,
          cursor: loaded ? "pointer" : "not-allowed",
        }}
      >
        {loaded ? "Validate" : "Loading rules…"}
      </button>

      {problems.length > 0 && (
        <ul style={{ color: "#b00020", marginTop: "1rem" }}>
          {problems.map((p, i) => (
            <li key={i}>
              {getFieldLabel(p.field)}: {getProblemErrorMessage(p)}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
