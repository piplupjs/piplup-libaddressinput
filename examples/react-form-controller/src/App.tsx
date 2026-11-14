import * as React from 'react';

import {
  HybridSource,
  MemoryStorage,
  PreloadSupplier,
  getProblemErrorMessage,
} from '@piplup/libaddressinput';
import {
  AddressProvider,
  useAddress,
  useAddressContext,
  useCountries,
  useSubRegions,
  useValidate,
} from '@piplup/libaddressinput-react';

import type { AddressData, AddressField, ValidationProblem } from '@piplup/libaddressinput';

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());

export function App() {
  const [regionCode, setRegionCode] = React.useState('US');
  const [values, setValues] = React.useState<AddressData>({ regionCode: 'US' });
  const address = useAddress({ region: regionCode, supplier });
  const { isValid, problems, validate, validating } = useValidate(supplier);
  const [hasValidated, setHasValidated] = React.useState(false);

  function setField(key: keyof AddressData, value: string): void {
    setValues((prev) => ({
      ...prev,
      [key]: key === 'addressLine' ? [value] : value,
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
        fontFamily: 'system-ui, sans-serif',
        margin: '2rem auto',
        maxWidth: '32rem',
      }}
    >
      <h1>Address form (react-form-controller)</h1>

      <AddressProvider value={address}>
        <RegionSelector onChange={handleRegionChange} value={regionCode} />

        {address.loading && <p>Loading region data…</p>}

        <AddressFields
          onChange={setField}
          problems={hasValidated ? problems : []}
          values={values}
        />

        <button
          style={{
            background: '#0052cc',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: address.loading || validating ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            marginTop: '1.25rem',
            padding: '0.6rem 1.25rem',
          }}
          disabled={address.loading || validating}
          onClick={() => void handleValidate()}
          type="button"
        >
          {validating ? 'Validating…' : 'Validate now'}
        </button>

        {hasValidated && isValid && !address.loading && (
          <div style={{ color: '#006644', fontWeight: 600, marginTop: '1rem' }}>
            ✓ Form is valid
          </div>
        )}
      </AddressProvider>
    </main>
  );
}

function RegionSelector({
  onChange,
  value,
}: {
  onChange: (region: string) => void;
  value: string;
}) {
  const countries = useCountries({ priority: ['US', 'CA', 'GB', 'IN'] });

  return (
    <label>
      Region
      <select
        style={{
          display: 'block',
          marginTop: '0.25rem',
          padding: '0.5rem',
          width: '100%',
        }}
        onChange={(event) => onChange(event.target.value)}
        value={value}
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
  onChange,
  problems,
  values,
}: {
  onChange: (key: keyof AddressData, value: string) => void;
  problems: ValidationProblem[];
  values: AddressData;
}) {
  const { rows } = useAddressContext();

  // Cascading subregions for LOCALITY based on current administrativeArea selection
  const localitySubRegions = useSubRegions('LOCALITY', {
    parentKey: values.administrativeArea,
  });

  const errorsFor = (field: AddressField) =>
    problems.filter((p) => p.field === field).map((p) => getProblemErrorMessage(p));

  return (
    <React.Fragment>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: '0.5rem' }}>
          {row.map((item) => {
            const isLocalitySelect = item.field === 'LOCALITY' && localitySubRegions.length > 0;
            const options = isLocalitySelect ? localitySubRegions : item.options;
            const isSelect = (item.isSelect && item.options) || isLocalitySelect;
            const errors = errorsFor(item.field);

            return (
              <div
                key={item.field}
                style={{ flex: item.length === 'long' ? 1 : 0.5, marginTop: '0.75rem' }}
              >
                <label style={{ display: 'block' }}>
                  {item.label}
                  {item.required ? ' *' : ''}
                  {isSelect && options ? (
                    <select
                      style={{
                        display: 'block',
                        marginTop: '0.25rem',
                        padding: '0.5rem',
                        width: '100%',
                      }}
                      onChange={(event) => onChange(item.key, event.target.value)}
                      value={(values[item.key] as string) ?? ''}
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
                      style={{
                        boxSizing: 'border-box',
                        display: 'block',
                        marginTop: '0.25rem',
                        padding: '0.5rem',
                        width: '100%',
                      }}
                      value={
                        Array.isArray(values[item.key])
                          ? ((values[item.key] as string[])[0] ?? '')
                          : ((values[item.key] as string) ?? '')
                      }
                      autoComplete={item.autoComplete}
                      onChange={(event) => onChange(item.key, event.target.value)}
                      type="text"
                    />
                  )}
                  {errors.map((msg, i) => (
                    <div
                      style={{
                        color: '#b00020',
                        fontSize: '0.85em',
                        marginTop: '0.25rem',
                      }}
                      key={i}
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
    </React.Fragment>
  );
}
