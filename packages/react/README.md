# @piplup/libaddressinput-react

Headless React hooks and context for [`@piplup/libaddressinput`](https://github.com/google/libaddressinput) (Google's address input library).

Zero DOM opinions, zero CSS, 100% form-library agnostic. Works with **React Hook Form**, **TanStack Form**, standard React state, or native HTML forms across **Web** and **React Native**.

---

## Installation

```bash
npm install @piplup/libaddressinput @piplup/libaddressinput-react
# or
pnpm add @piplup/libaddressinput @piplup/libaddressinput-react
```

---

## Key Features

- **Form-Library Agnostic**: Plugs seamlessly into `register(...)` from React Hook Form, `<form.Field>` from TanStack Form, or simple `useState`.
- **Context & Control Pattern**: Inspired by React Hook Form (`FormProvider` and `useController`). Use `<AddressProvider>` and `useField()` to access field metadata anywhere in your component tree without prop drilling.
- **Dynamic Google Address Layouts**: Automatically formats layout rows, field order, required indicators, and localized field names (e.g. "PIN code" in India, "ZIP code" in the US, "Prefecture" in Japan).
- **Cascading Subregions**: Instant access to states, provinces, and districts via `useSubRegions()`.
- **Intl Country Options**: Localized country names sorted and prioritized with `useCountries()`.
- **WHATWG Autofill**: Exposes standard autocomplete tokens (`street-address`, `postal-code`, etc.) on all fields.
- **SSR & React 18+ Concurrent Ready**: Includes `"use client"` directive, hydration-safe, zero DOM globals.

---

## Quick Start (with React Hook Form)

```tsx
import { useForm, FormProvider } from "react-hook-form";
import {
  PreloadSupplier,
  HybridSource,
  MemoryStorage,
} from "@piplup/libaddressinput";
import {
  AddressProvider,
  useAddress,
  useAddressContext,
  useCountries,
  useField,
} from "@piplup/libaddressinput-react";

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());

export function ShippingForm() {
  const methods = useForm({ defaultValues: { country: "US" } });
  const country = methods.watch("country");
  const address = useAddress({ supplier, region: country });
  const countries = useCountries({ priority: ["US", "CA", "GB", "IN"] });

  return (
    <FormProvider {...methods}>
      <AddressProvider value={address}>
        <div style={{ maxWidth: 480, margin: "auto" }}>
          {/* Country Selector */}
          <label>
            Country
            <select {...methods.register("country")}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Dynamic Address Rows */}
          <AddressFields />
        </div>
      </AddressProvider>
    </FormProvider>
  );
}

function AddressFields() {
  const { rows, loading } = useAddressContext();
  const { register } = useForm();

  if (loading) return <p>Loading address format…</p>;

  return (
    <>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", gap: "0.5rem" }}>
          {row.map((item) => (
            <div key={item.field} style={{ flex: item.length === "long" ? 1 : 0.5 }}>
              <label>
                {item.label} {item.required && "*"}
              </label>

              {item.isSelect ? (
                <select {...register(item.key)}>
                  <option value="">Select {item.label}…</option>
                  {item.options?.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  autoComplete={item.autoComplete}
                  {...register(item.key)}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
```

---

## Granular Field Controller (`useField`)

Similar to React Hook Form's `useController`, you can isolate individual field logic into separate components:

```tsx
function PostalCodeInput() {
  const { label, required, autoComplete, key } = useField("POSTAL_CODE");
  const { register, formState: { errors } } = useFormContext();

  return (
    <div>
      <label>{label} {required && "*"}</label>
      <input type="text" autoComplete={autoComplete} {...register(key)} />
      {errors[key] && <p className="error">{errors[key]?.message}</p>}
    </div>
  );
}
```

---

## API Reference

### `useAddress(options)`
Creates the reactive address instance.
- **Parameters**:
  - `supplier`: Address data supplier (e.g. `PreloadSupplier`).
  - `region`: ISO 3166-1 alpha-2 country code (e.g. `"US"`, `"IN"`).
  - `locale?`: Language tag (default `"en"`).
  - `labels?`: Custom field label overrides (`Partial<Record<AddressField, string>>`).
  - `messages?`: Custom translation message dictionary.
- **Returns**: `AddressState` (`region`, `rows`, `fields`, `tree`, `loading`, `error`, `getField`).

### `useCountries(options?)`
Returns a localized list of countries formatted using `Intl.DisplayNames`.
- **Options**:
  - `locale?`: Locale tag (default `"en"`).
  - `priority?`: Array of country codes to pin to the top of the list (e.g. `["US", "IN"]`).

### `useSubRegions(field, options?)`
Provides choices for administrative areas (states, provinces) or localities (cities).
- **Options**:
  - `parentKey?`: Parent region key for cascading dropdowns (e.g. state code to get cities).
  - `state?`: Explicit `AddressState` if used outside `<AddressProvider>`.

### `useValidate(supplier)` & `createValidator(supplier)`
Validates an address object, filtering internal metadata flags so only user-correctable errors are reported.

### `useFormat(supplier)`
Provides envelope and single-line address formatting utilities.

---

## License

Apache-2.0
