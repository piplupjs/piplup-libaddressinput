import { createContext, useContext, type ReactNode } from "react";
import type { AddressState } from "./types.js";

export const AddressContext = createContext<AddressState | null>(null);

export interface AddressProviderProps {
  value: AddressState;
  children?: ReactNode;
}

export function AddressProvider({ value, children }: AddressProviderProps) {
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddressContext(): AddressState {
  const context = useContext(AddressContext);
  if (!context) {
    throw new Error("useAddressContext must be used within an AddressProvider");
  }
  return context;
}
