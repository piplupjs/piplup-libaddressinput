import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useFormat } from './useFormat.js';

describe('useFormat', () => {
  it('formats an address into lines and single line', () => {
    const { result } = renderHook(() => useFormat());

    const address = {
      addressLine: ['100 Main St'],
      administrativeArea: 'CA',
      locality: 'San Jose',
      postalCode: '95110',
      regionCode: 'US',
    };

    const lines = result.current.format(address);
    expect(lines).toContain('100 Main St');
    // Live snapshot US format uses comma: "%C, %S %Z"
    expect(lines).toContain('San Jose, CA 95110');

    const singleLine = result.current.formatSingleLine(address);
    expect(singleLine).toBe('100 Main St, San Jose, CA 95110');
  });
});
