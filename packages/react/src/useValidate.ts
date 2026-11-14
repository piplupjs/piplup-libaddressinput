import * as React from 'react';

import { getUserProblems, validate } from '@piplup/libaddressinput';

import type {
  AddressData,
  Supplier,
  ValidateOptions,
  ValidationProblem,
} from '@piplup/libaddressinput';

export function useValidate(supplier: Supplier, defaultOptions?: ValidateOptions) {
  const [validating, setValidating] = React.useState(false);
  const [problems, setProblems] = React.useState<ValidationProblem[]>([]);

  const run = React.useCallback(
    async (address: AddressData, options?: ValidateOptions): Promise<ValidationProblem[]> => {
      setValidating(true);
      try {
        const result = await validate(supplier, address, options ?? defaultOptions);
        const userProblems = getUserProblems(result);
        setProblems(userProblems);
        return userProblems;
      } finally {
        setValidating(false);
      }
    },
    [supplier, defaultOptions],
  );

  return {
    isValid: problems.length === 0,
    problems,
    validate: run,
    validating,
  };
}

export function createValidator(supplier: Supplier, defaultOptions?: ValidateOptions) {
  return async (address: AddressData, options?: ValidateOptions): Promise<ValidationProblem[]> => {
    const result = await validate(supplier, address, options ?? defaultOptions);
    return getUserProblems(result);
  };
}
