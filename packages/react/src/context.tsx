import * as React from 'react';

import type { AddressState } from './types.js';

export const AddressContext = React.createContext<AddressState | null>(null);

export interface AddressProviderProps {
  children?: React.ReactNode;
  value: AddressState;
}

export function AddressProvider({ children, value }: AddressProviderProps) {
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddressContext(): AddressState {
  const context = React.useContext(AddressContext);
  if (!context) {
    throw new Error('useAddressContext must be used within an AddressProvider');
  }
  return context;
}
