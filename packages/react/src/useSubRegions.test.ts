import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSubRegions } from './useSubRegions.js';

import type { AddressState } from './types.js';

const mockTree = {
  key: 'US',
  name: 'United States',
  subRegions: [
    {
      key: 'CA',
      name: 'California',
      subRegions: [
        {
          key: 'Los Angeles',
          name: 'Los Angeles',
          subRegions: [],
        },
      ],
    },
    {
      key: 'NY',
      name: 'New York',
      subRegions: [],
    },
  ],
};

const mockState: AddressState = {
  error: null,
  fields: [],
  getField: () => undefined,
  loading: false,
  region: 'US',
  rows: [],
  supplier: {} as unknown as AddressState['supplier'],
  tree: mockTree,
};

describe('useSubRegions', () => {
  it('extracts top-level subregions for ADMIN_AREA', () => {
    const { result } = renderHook(() => useSubRegions('ADMIN_AREA', { state: mockState }));
    expect(result.current.length).toBe(2);
    expect(result.current[0]).toEqual({
      key: 'CA',
      label: 'California (CA)',
      name: 'California',
    });
    expect(result.current[1]).toEqual({
      key: 'NY',
      label: 'New York (NY)',
      name: 'New York',
    });
  });

  it('extracts nested subregions for LOCALITY given parentKey', () => {
    const { result } = renderHook(() =>
      useSubRegions('LOCALITY', { parentKey: 'CA', state: mockState }),
    );
    expect(result.current.length).toBe(1);
    expect(result.current[0]?.key).toBe('Los Angeles');
  });

  it('returns empty array when tree is null', () => {
    const emptyState = { ...mockState, tree: null };
    const { result } = renderHook(() => useSubRegions('ADMIN_AREA', { state: emptyState }));
    expect(result.current).toEqual([]);
  });
});
