import { useCallback, useState } from "react";
import {
  getUserProblems,
  validate,
  type AddressData,
  type Supplier,
  type ValidateOptions,
  type ValidationProblem,
} from "@piplup/libaddressinput";

export function useValidate(supplier: Supplier, defaultOptions?: ValidateOptions) {
  const [validating, setValidating] = useState(false);
  const [problems, setProblems] = useState<ValidationProblem[]>([]);

  const run = useCallback(
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
    validate: run,
    validating,
    problems,
    isValid: problems.length === 0,
  };
}

export function createValidator(supplier: Supplier, defaultOptions?: ValidateOptions) {
  return async (address: AddressData, options?: ValidateOptions): Promise<ValidationProblem[]> => {
    const result = await validate(supplier, address, options ?? defaultOptions);
    return getUserProblems(result);
  };
}
