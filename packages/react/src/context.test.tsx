import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddressProvider, useAddressContext } from './context.js';

import type { AddressState } from './types.js';

const mockState: AddressState = {
  error: null,
  fields: [],
  getField: () => undefined,
  loading: false,
  region: 'US',
  rows: [],
  supplier: {} as unknown as AddressState['supplier'],
  tree: null,
};

describe('AddressContext', () => {
  it('throws when useAddressContext is called outside of AddressProvider', () => {
    expect(() => renderHook(() => useAddressContext())).toThrow(
      'useAddressContext must be used within an AddressProvider',
    );
  });

  it('provides the address state to children', () => {
    function Consumer() {
      const state = useAddressContext();
      return <div data-testid="region">{state.region}</div>;
    }

    render(
      <AddressProvider value={mockState}>
        <Consumer />
      </AddressProvider>,
    );

    expect(screen.getByTestId('region').textContent).toBe('US');
  });
});
