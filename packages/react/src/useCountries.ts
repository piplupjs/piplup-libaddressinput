import * as React from 'react';

import { getRegionOptions } from '@piplup/libaddressinput';

import type { CountriesOptions, Country } from './types.js';

export function useCountries(opts?: CountriesOptions): Country[] {
  const locale = opts?.locale ?? 'en';
  // Key the memo on the codes, not the array, so a new array literal on each
  // render doesn't rebuild the list.
  const priorityKey = opts?.priority?.join(',') ?? '';

  return React.useMemo(() => {
    const list = getRegionOptions(locale);
    const priority = priorityKey ? priorityKey.split(',') : [];
    if (priority.length === 0) {
      return list;
    }

    const prioritySet = new Set(priority);
    const byCode = new Map(list.map((c) => [c.code, c]));

    const prioritized: Country[] = [];
    for (const code of priority) {
      const match = byCode.get(code);
      if (match) {
        prioritized.push(match);
      }
    }

    const remaining = list.filter((c) => !prioritySet.has(c.code));
    return [...prioritized, ...remaining];
  }, [locale, priorityKey]);
}
