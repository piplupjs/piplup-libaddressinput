// A stateless-integration example: plain React `useState`, calling
// buildLayout() and validate() directly — no custom hook, no
// createAddressForm(). Shows the smallest possible integration.

import { useEffect, useMemo, useState } from "react";
import {
  FetchSource,
  MemoryStorage,
  PreloadSupplier,
  buildLayout,
  getRegionCodes,
  validate,
  type AddressData,
  type LayoutField,
  type ValidationProblem,
} from "@piplup/libaddressinput";
import { en } from "@piplup/libaddressinput/messages/en";

const supplier = new PreloadSupplier(new FetchSource(), new MemoryStorage());

const FIELD_KEYS: Record<LayoutField["field"], keyof AddressData | undefined> = {
  COUNTRY: undefined,
  ADMIN_AREA: "administrativeArea",
  LOCALITY: "locality",
  DEPENDENT_LOCALITY: "dependentLocality",
  SORTING_CODE: "sortingCode",
  POSTAL_CODE: "postalCode",
  STREET_ADDRESS: "addressLine",
  ORGANIZATION: "organization",
  RECIPIENT: "recipient",
};

function labelText(field: LayoutField): string {
  if (field.labelId === "CEDEX") return "CEDEX";
  if (field.labelId === undefined) return field.field;
  return en[field.labelId];
}

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
    () => (loaded ? buildLayout(values.regionCode, "en") : null),
    [loaded, values.regionCode],
  );

  function setField(field: LayoutField["field"], value: string): void {
    const key = FIELD_KEYS[field];
    if (key === undefined) return;
    setValues((prev) => ({
      ...prev,
      [key]: field === "STREET_ADDRESS" ? [value] : value,
    }));
  }

  async function onValidate(): Promise<void> {
    setProblems(await validate(supplier, values));
  }

  return (
    <main style={{ maxWidth: "32rem", margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Address form (react-basic)</h1>
      <label>
        Region
        <select
          value={values.regionCode}
          onChange={(e) => setValues({ regionCode: e.target.value })}
          style={{ display: "block", width: "100%" }}
        >
          {getRegionCodes().map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>

      {layout?.rows.flat().map((item) =>
        item.kind === "field" && FIELD_KEYS[item.field] !== undefined ? (
          <label key={item.field} style={{ display: "block", marginTop: "0.75rem" }}>
            {labelText(item)}
            {item.required ? " *" : ""}
            <input
              type="text"
              style={{ display: "block", width: "100%", boxSizing: "border-box" }}
              onChange={(e) => setField(item.field, e.target.value)}
            />
          </label>
        ) : null,
      )}

      <button type="button" onClick={() => void onValidate()} style={{ marginTop: "1rem" }}>
        Validate
      </button>

      {problems.length > 0 && (
        <ul>
          {problems.map((p, i) => (
            <li key={i}>
              {p.field}: {p.problem}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
