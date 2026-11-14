import * as React from 'react';

import { HybridSource, MemoryStorage, PreloadSupplier } from '@piplup/libaddressinput';
import { useAddress, useCountries, useValidate } from '@piplup/libaddressinput-react';

import type { AddressData } from '@piplup/libaddressinput';

const supplier = new PreloadSupplier(new HybridSource(), new MemoryStorage());

export function App() {
  const [regionCode, setRegionCode] = React.useState('US');
  const [values, setValues] = React.useState<AddressData>({ regionCode: 'US' });
  const countries = useCountries();
  const address = useAddress({ region: regionCode, supplier });
  const { problems, validate, validating } = useValidate(supplier);

  function setField(key: keyof AddressData, value: string): void {
    setValues((prev) => ({
      ...prev,
      [key]: key === 'addressLine' ? [value] : value,
    }));
  }

  function handleRegionChange(newRegion: string): void {
    setRegionCode(newRegion);
    setValues({ regionCode: newRegion });
  }

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        margin: '2rem auto',
        maxWidth: '32rem',
      }}
    >
      <h1>Address form (react-basic)</h1>
      <label>
        Region
        <select
          style={{
            display: 'block',
            marginTop: '0.25rem',
            padding: '0.5rem',
            width: '100%',
          }}
          onChange={(event) => handleRegionChange(event.target.value)}
          value={regionCode}
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
        <div key={rowIndex} style={{ display: 'flex', gap: '0.5rem' }}>
          {row.map((item) => (
            <div
              key={item.field}
              style={{ flex: item.length === 'long' ? 1 : 0.5, marginTop: '0.75rem' }}
            >
              <label style={{ display: 'block' }}>
                {item.label}
                {item.required ? ' *' : ''}
                {item.isSelect && item.options ? (
                  <select
                    style={{
                      boxSizing: 'border-box',
                      display: 'block',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      width: '100%',
                    }}
                    onChange={(event) => setField(item.key, event.target.value)}
                    value={(values[item.key] as string) ?? ''}
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
                    style={{
                      boxSizing: 'border-box',
                      display: 'block',
                      marginTop: '0.25rem',
                      padding: '0.5rem',
                      width: '100%',
                    }}
                    autoComplete={item.autoComplete}
                    onChange={(event) => setField(item.key, event.target.value)}
                    type="text"
                  />
                )}
              </label>
            </div>
          ))}
        </div>
      ))}

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
        onClick={() => void validate(values)}
        type="button"
      >
        {validating ? 'Validating…' : 'Validate'}
      </button>

      {problems.length > 0 && (
        <ul style={{ color: '#b00020', marginTop: '1rem' }}>
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
