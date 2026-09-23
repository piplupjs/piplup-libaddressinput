// Port of cpp/include/libaddressinput/address_problem.h (Apache-2.0, Google Inc.)

export const ADDRESS_PROBLEMS = [
  "UNEXPECTED_FIELD",
  "MISSING_REQUIRED_FIELD",
  "UNKNOWN_VALUE",
  "INVALID_FORMAT",
  "MISMATCHING_VALUE",
  "USES_P_O_BOX",
  "UNSUPPORTED_FIELD",
] as const;

export type AddressProblem = (typeof ADDRESS_PROBLEMS)[number];
