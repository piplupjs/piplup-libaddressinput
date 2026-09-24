import { useContext } from "react";
import type { AddressField } from "@piplup/libaddressinput";
import { AddressContext } from "./context.js";
import type { AddressState, FieldMeta } from "./types.js";

export interface UseFieldOptions {
  state?: AddressState;
}

export function useField(
  field: AddressField | string,
  opts?: UseFieldOptions,
): FieldMeta | undefined {
  const context = useContext(AddressContext);
  const state = opts?.state ?? context;

  if (!state) {
    throw new Error(
      "useField must be used within an AddressProvider or supplied with an explicit state option",
    );
  }

  return state.getField(field);
}
