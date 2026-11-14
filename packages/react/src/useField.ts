import * as React from 'react';

import { AddressContext } from './context.js';

import type { AddressState, FieldMeta } from './types.js';
import type { AddressField } from '@piplup/libaddressinput';

export interface UseFieldOptions {
  state?: AddressState;
}

export function useField(
  field: AddressField | string,
  opts?: UseFieldOptions,
): FieldMeta | undefined {
  const context = React.useContext(AddressContext);
  const state = opts?.state ?? context;

  if (!state) {
    throw new Error(
      'useField must be used within an AddressProvider or supplied with an explicit state option',
    );
  }

  return state.getField(field);
}
