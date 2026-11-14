import { FallbackAggregateSource, MemoryStorage, PreloadSupplier } from '@piplup/libaddressinput';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createValidator, useValidate } from './useValidate.js';

import type { ValidationProblem } from '@piplup/libaddressinput';

const supplier = new PreloadSupplier(new FallbackAggregateSource(), new MemoryStorage());

describe('useValidate & createValidator', () => {
  it('validates an address asynchronously and exposes state', async () => {
    await supplier.loadRules('US');
    const { result } = renderHook(() => useValidate(supplier));

    expect(result.current.validating).toBe(false);

    let problems: ValidationProblem[] = [];
    await act(async () => {
      problems = await result.current.validate({
        regionCode: 'US',
        // missing required fields
      });
    });

    expect(problems.length).toBeGreaterThan(0);
    expect(result.current.isValid).toBe(false);
    expect(result.current.problems.length).toBe(problems.length);
  });

  it('createValidator returns a reusable validation function', async () => {
    await supplier.loadRules('US');
    const validator = createValidator(supplier);

    const validAddress = {
      addressLine: ['100 Main St'],
      administrativeArea: 'CA',
      locality: 'San Jose',
      postalCode: '95110',
      regionCode: 'US',
    };

    const problems = await validator(validAddress);
    expect(problems).toEqual([]);
  });
});
