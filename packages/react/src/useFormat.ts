import { useCallback } from "react";
import {
  formatAddress,
  formatAddressAsSingleLine,
  type AddressData,
} from "@piplup/libaddressinput";

export function useFormat() {
  const format = useCallback((address: AddressData): string[] => {
    return formatAddress(address);
  }, []);

  const formatSingleLine = useCallback((address: AddressData): string => {
    return formatAddressAsSingleLine(address);
  }, []);

  return { format, formatSingleLine };
}
