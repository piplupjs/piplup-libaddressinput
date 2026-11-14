import * as React from 'react';

import { formatAddress, formatAddressAsSingleLine } from '@piplup/libaddressinput';

import type { AddressData } from '@piplup/libaddressinput';

export function useFormat() {
  const format = React.useCallback((address: AddressData): string[] => {
    return formatAddress(address);
  }, []);

  const formatSingleLine = React.useCallback((address: AddressData): string => {
    return formatAddressAsSingleLine(address);
  }, []);

  return { format, formatSingleLine };
}
