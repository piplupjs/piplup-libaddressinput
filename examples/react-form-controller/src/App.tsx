import { useState } from "react";
import {
  HybridSource,
  MemoryStorage,
  PreloadSupplier,
  getProblemErrorMessage,
  type AddressData,
  type AddressField,
} from "@piplup/libaddressinput";
import {
  AddressProvider,
  useAddress,
  useAddressContext,
  useCountries,
  useSubRegions,
  useValidate,
} from "@piplup/libaddressinput-react";

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());

export function App() {
  const [regionCode, setRegionCode] = useState("US");
  const [values, setValues] = useState<AddressData>({ regionCode: "US" });
  const address = useAddress({ supplier, region: regionCode });
  const { validate, validating, problems, isValid } = useValidate(supplier);
  const [hasValidated, setHasValidated] = useState(false);

  function setField(key: keyof AddressData, value: string): void {
    setValues((prev) => ({
      ...prev,
      [key]: key === "addressLine" ? [value] : value,
    }));
  }

  function handleRegionChange(newRegion: string): void {
    setRegionCode(newRegion);
    setValues({ regionCode: newRegion });
    setHasValidated(false);
  }

  async function handleValidate(): Promise<void> {
    setHasValidated(true);
    await validate(values);
  }

  return (
    <main
      style={{
        maxWidth: "32rem",
        margin: "2rem auto",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>Address form (react-form-controller)</h1>

      <AddressProvider value={address}>
        <RegionSelector value={regionCode} onChange={handleRegionChange} />

        {address.loading && <p>Loading region data…</p>}

        <AddressFields
          values={values}
          onChange={setField}
          problems={hasValidated ? problems : []}
        />

        <button
          type="button"
          onClick={() => void handleValidate()}
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
          {validating ? "Validating…" : "Validate now"}
        </button>

        {hasValidated && isValid && !address.loading && (
          <div style={{ marginTop: "1rem", color: "#006644", fontWeight: 600 }}>
            ✓ Form is valid
          </div>
        )}
      </AddressProvider>
    </main>
  );
}

function RegionSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (region: string) => void;
}) {
  const countries = useCountries({ priority: ["US", "CA", "GB", "IN"] });

  return (
    <label>
      Region
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          padding: "0.5rem",
          marginTop: "0.25rem",
        }}
      >
        {countries.map(({ code, name }) => (
          <option key={code} value={code}>
            {name} ({code})
          </option>
        ))}
      </select>
    </label>
  );
}

function AddressFields({
  values,
  onChange,
  problems,
}: {
  values: AddressData;
  onChange: (key: keyof AddressData, value: string) => void;
  problems: import("@piplup/libaddressinput").ValidationProblem[];
}) {
  const { rows } = useAddressContext();

  // Cascading subregions for LOCALITY based on current administrativeArea selection
  const localitySubRegions = useSubRegions("LOCALITY", {
    parentKey: values.administrativeArea,
  });

  const errorsFor = (field: AddressField) =>
    problems.filter((p) => p.field === field).map((p) => getProblemErrorMessage(p));

  return (
    <>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: "flex", gap: "0.5rem" }}>
          {row.map((item) => {
            const isLocalitySelect =
              item.field === "LOCALITY" && localitySubRegions.length > 0;
            const options = isLocalitySelect ? localitySubRegions : item.options;
            const isSelect = (item.isSelect && item.options) || isLocalitySelect;
            const errors = errorsFor(item.field);

            return (
              <div
                key={item.field}
                style={{ flex: item.length === "long" ? 1 : 0.5, marginTop: "0.75rem" }}
              >
                <label style={{ display: "block" }}>
                  {item.label}
                  {item.required ? " *" : ""}
                  {isSelect && options ? (
                    <select
                      value={(values[item.key] as string) ?? ""}
                      onChange={(e) => onChange(item.key, e.target.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "0.5rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      <option value="">Select {item.label}…</option>
                      {options.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      autoComplete={item.autoComplete}
                      value={
                        Array.isArray(values[item.key])
                          ? ((values[item.key] as string[])[0] ?? "")
                          : ((values[item.key] as string) ?? "")
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "0.5rem",
                        marginTop: "0.25rem",
                      }}
                      onChange={(e) => onChange(item.key, e.target.value)}
                    />
                  )}
                  {errors.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        color: "#b00020",
                        fontSize: "0.85em",
                        marginTop: "0.25rem",
                      }}
                    >
                      {msg}
                    </div>
                  ))}
                </label>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
