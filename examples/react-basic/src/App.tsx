import { useState } from "react";
import {
  HybridSource,
  MemoryStorage,
  PreloadSupplier,
  type AddressData,
} from "@piplup/libaddressinput";
import { useAddress, useCountries, useValidate } from "@piplup/libaddressinput-react";

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());

export function App() {
  const [regionCode, setRegionCode] = useState("US");
  const [values, setValues] = useState<AddressData>({ regionCode: "US" });
  const countries = useCountries();
  const address = useAddress({ supplier, region: regionCode });
  const { validate, validating, problems } = useValidate(supplier);

  function setField(key: keyof AddressData, value: string): void {
    setValues((prev) => ({
      ...prev,
      [key]: key === "addressLine" ? [value] : value,
    }));
  }

  function handleRegionChange(newRegion: string): void {
    setRegionCode(newRegion);
    setValues({ regionCode: newRegion });
  }

  return (
    <main style={{ maxWidth: "32rem", margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Address form (react-basic)</h1>
      <label>
        Region
        <select
          value={regionCode}
          onChange={(e) => handleRegionChange(e.target.value)}
          style={{ display: "block", width: "100%", padding: "0.5rem", marginTop: "0.25rem" }}
        >
          {countries.map(({ code, name }) => (
            <option key={code} value={code}>
              {name} ({code})
            </option>
          ))}
        </select>
      </label>

      {address.loading && <p>Loading address format…</p>}

      {address.rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: "flex", gap: "0.5rem" }}>
          {row.map((item) => (
            <div
              key={item.field}
              style={{ flex: item.length === "long" ? 1 : 0.5, marginTop: "0.75rem" }}
            >
              <label style={{ display: "block" }}>
                {item.label}
                {item.required ? " *" : ""}
                {item.isSelect && item.options ? (
                  <select
                    value={(values[item.key] as string) ?? ""}
                    onChange={(e) => setField(item.key, e.target.value)}
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "0.5rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    <option value="">Select {item.label}…</option>
                    {item.options.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    autoComplete={item.autoComplete}
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "0.5rem",
                      marginTop: "0.25rem",
                    }}
                    onChange={(e) => setField(item.key, e.target.value)}
                  />
                )}
              </label>
            </div>
          ))}
        </div>
      ))}

      <button
        type="button"
        onClick={() => void validate(values)}
        disabled={address.loading || validating}
        style={{
          marginTop: "1.25rem",
          padding: "0.6rem 1.25rem",
          background: "#0052cc",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          fontWeight: 600,
          cursor: address.loading || validating ? "not-allowed" : "pointer",
        }}
      >
        {validating ? "Validating…" : "Validate"}
      </button>

      {problems.length > 0 && (
        <ul style={{ color: "#b00020", marginTop: "1rem" }}>
          {problems.map((p, i) => (
            <li key={i}>
              {address.getField(p.field)?.label ?? p.field}: {p.problem}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
