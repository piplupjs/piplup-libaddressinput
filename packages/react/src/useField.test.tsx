import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddressProvider } from './context.js';
import { useField } from './useField.js';

import type { AddressState } from './types.js';

const mockField = {
  autoComplete: 'postal-code',
  field: 'POSTAL_CODE' as const,
  isSelect: false,
  key: 'postalCode' as const,
  label: 'ZIP code',
  length: 'short' as const,
  multiline: false,
  required: true,
};

const mockState: AddressState = {
  error: null,
  fields: [mockField],
  getField: (query) => (query === 'POSTAL_CODE' || query === 'postalCode' ? mockField : undefined),
  loading: false,
  region: 'US',
  rows: [[mockField]],
  supplier: {} as unknown as AddressState['supplier'],
  tree: null,
};

describe('useField', () => {
  it('throws when called without context or state option', () => {
    expect(() => renderHook(() => useField('POSTAL_CODE'))).toThrow(
      'useField must be used within an AddressProvider or supplied with an explicit state option',
    );
  });

  it('reads field from context', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AddressProvider value={mockState}>{children}</AddressProvider>
    );

    const { result } = renderHook(() => useField('POSTAL_CODE'), { wrapper });
    expect(result.current).toEqual(mockField);
  });

  it('reads field from explicit state option without context', () => {
    const { result } = renderHook(() => useField('postalCode', { state: mockState }));
    expect(result.current).toEqual(mockField);
  });
});
