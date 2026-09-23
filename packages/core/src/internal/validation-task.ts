// Port of cpp/src/validation_task.h / .cc (Apache-2.0, Google Inc.) — the
// pure "given a rule hierarchy, find problems" half of validation. Split out
// from validator.ts (which does the supplier-resolution half) so it can be
// tested directly against a hand-built RuleHierarchy, the same way upstream's
// ValidationTaskTest calls `task->supplied_` directly instead of going
// through a real Supplier.

import { isFieldEmpty, type AddressData } from "../address-data.js";
import type { AddressField } from "../address-field.js";
import { LOOKUP_KEY_HIERARCHY } from "./lookup-key.js";
import { getPostBoxMatchers } from "./post-box-matchers.js";
import { isFieldRequired, isFieldUsed } from "../metadata.js";
import type { AddressProblem } from "../problem.js";
import type { RuleHierarchy } from "../supplier/supplier.js";

export interface ValidationProblem {
  field: AddressField;
  problem: AddressProblem;
}

export interface RunValidationChecksOptions {
  allowPostal: boolean;
  requireName: boolean;
  filter: ValidationProblem[] | undefined;
  /** From `supplier.getLoadedRuleDepth()`, captured before resolving `hierarchy`. */
  maxDepth: number;
}

function shouldReport(
  filter: ValidationProblem[] | undefined,
  field: AddressField,
  problem: AddressProblem,
): boolean {
  return (
    filter === undefined ||
    filter.length === 0 ||
    filter.some((entry) => entry.field === field && entry.problem === problem)
  );
}

// RE2::FullMatch equivalent: the whole string must match. Our stored
// matchers are anchored at the start only (see internal/rule.ts), so a full
// match additionally requires the match to consume the entire string.
function fullyMatches(regex: RegExp, value: string): boolean {
  const match = regex.exec(value);
  return match !== null && match[0].length === value.length;
}

// RE2::PartialMatch equivalent: matches anywhere (here, effectively a
// prefix match, since the stored patterns are anchored at the start).
function partiallyMatches(regex: RegExp, value: string): boolean {
  return regex.test(value);
}

const UNEXPECTED_FIELD_CHECK_FIELDS: AddressField[] = [
  // COUNTRY is never unexpected.
  "ADMIN_AREA",
  "LOCALITY",
  "DEPENDENT_LOCALITY",
  "SORTING_CODE",
  "POSTAL_CODE",
  "STREET_ADDRESS",
  "ORGANIZATION",
  "RECIPIENT",
];

const MISSING_REQUIRED_FIELD_CHECK_FIELDS: AddressField[] = [
  // COUNTRY is assumed to have already been checked.
  "ADMIN_AREA",
  "LOCALITY",
  "DEPENDENT_LOCALITY",
  "SORTING_CODE",
  "POSTAL_CODE",
  "STREET_ADDRESS",
  // ORGANIZATION is never required. RECIPIENT is handled separately.
];

/**
 * Runs every validation check against an already-resolved RuleHierarchy.
 * Mirrors `ValidationTask::Validate` (the part after supplier resolution
 * succeeds and `hierarchy.rule[0]` is non-null).
 */
export function runValidationChecks(
  address: AddressData,
  hierarchy: RuleHierarchy,
  options: RunValidationChecksOptions,
): ValidationProblem[] {
  const { allowPostal, requireName, filter, maxDepth } = options;
  const problems: ValidationProblem[] = [];

  const report = (field: AddressField, problem: AddressProblem): void => {
    problems.push({ field, problem });
  };
  const reportMaybe = (field: AddressField, problem: AddressProblem): void => {
    if (shouldReport(filter, field, problem)) {
      report(field, problem);
    }
  };

  if (isFieldEmpty(address, "COUNTRY")) {
    reportMaybe("COUNTRY", "MISSING_REQUIRED_FIELD");
    return problems;
  }
  if (hierarchy[0] === undefined) {
    reportMaybe("COUNTRY", "UNKNOWN_VALUE");
    return problems;
  }

  const regionCode = address.regionCode;

  // Checks which use only the bundled fallback metadata.
  checkUnexpectedField(address, regionCode, reportMaybe);
  checkMissingRequiredField(address, regionCode, requireName, reportMaybe);

  // Checks which use the supplier's loaded hierarchy. Note
  // checkPostalCodeFormatAndValue assumes checkUnexpectedField already ran.
  checkUnknownValue(address, hierarchy, reportMaybe);
  checkPostalCodeFormatAndValue(address, hierarchy, problems, filter, report);
  checkUsesPoBox(address, hierarchy, allowPostal, filter, report);
  checkUnsupportedField(maxDepth, reportMaybe);

  return problems;
}

type ReportFn = (field: AddressField, problem: AddressProblem) => void;

// A field is UNEXPECTED_FIELD if it has a value but the region doesn't use it.
function checkUnexpectedField(
  address: AddressData,
  regionCode: string,
  reportMaybe: ReportFn,
): void {
  for (const field of UNEXPECTED_FIELD_CHECK_FIELDS) {
    if (!isFieldEmpty(address, field) && !isFieldUsed(field, regionCode)) {
      reportMaybe(field, "UNEXPECTED_FIELD");
    }
  }
}

// A field is MISSING_REQUIRED_FIELD if it's empty but the region requires it.
function checkMissingRequiredField(
  address: AddressData,
  regionCode: string,
  requireName: boolean,
  reportMaybe: ReportFn,
): void {
  for (const field of MISSING_REQUIRED_FIELD_CHECK_FIELDS) {
    if (isFieldEmpty(address, field) && isFieldRequired(field, regionCode)) {
      reportMaybe(field, "MISSING_REQUIRED_FIELD");
    }
  }
  if (requireName && isFieldEmpty(address, "RECIPIENT")) {
    reportMaybe("RECIPIENT", "MISSING_REQUIRED_FIELD");
  }
}

// A hierarchical field (ADMIN_AREA/LOCALITY/DEPENDENT_LOCALITY) is
// UNKNOWN_VALUE if its parent level has sub-keys but this value didn't
// resolve to any of them.
function checkUnknownValue(
  address: AddressData,
  hierarchy: RuleHierarchy,
  reportMaybe: ReportFn,
): void {
  for (let depth = 1; depth < LOOKUP_KEY_HIERARCHY.length; depth++) {
    const field = LOOKUP_KEY_HIERARCHY[depth]!;
    const parent = hierarchy[depth - 1];
    const isUnknown = !(
      isFieldEmpty(address, field) ||
      parent === undefined ||
      parent.subKeys.length === 0 ||
      hierarchy[depth] !== undefined
    );
    if (isUnknown) {
      reportMaybe(field, "UNKNOWN_VALUE");
    }
  }
}

function checkUnsupportedField(maxDepth: number, reportMaybe: ReportFn): void {
  for (let depth = maxDepth; depth < LOOKUP_KEY_HIERARCHY.length; depth++) {
    reportMaybe(LOOKUP_KEY_HIERARCHY[depth]!, "UNSUPPORTED_FIELD");
  }
}

// Note: assumes checkUnexpectedField has already run (it may have already
// reported POSTAL_CODE/UNEXPECTED_FIELD, which short-circuits this check).
function checkPostalCodeFormatAndValue(
  address: AddressData,
  hierarchy: RuleHierarchy,
  problems: ValidationProblem[],
  filter: ValidationProblem[] | undefined,
  report: ReportFn,
): void {
  const countryRule = hierarchy[0]!;

  if (
    !(
      shouldReport(filter, "POSTAL_CODE", "INVALID_FORMAT") ||
      shouldReport(filter, "POSTAL_CODE", "MISMATCHING_VALUE")
    )
  ) {
    return;
  }
  if (isFieldEmpty(address, "POSTAL_CODE")) {
    return;
  }
  if (
    problems.some((p) => p.field === "POSTAL_CODE" && p.problem === "UNEXPECTED_FIELD")
  ) {
    return; // Problem already reported.
  }

  const postalCode = address.postalCode ?? "";

  // Validate general postal code format: a country-level rule specifies the
  // regular expression for the whole postal code.
  const formatMatcher = countryRule.postalCodeMatcher;
  if (
    formatMatcher !== undefined &&
    !fullyMatches(formatMatcher, postalCode) &&
    shouldReport(filter, "POSTAL_CODE", "INVALID_FORMAT")
  ) {
    report("POSTAL_CODE", "INVALID_FORMAT");
    return;
  }

  if (!shouldReport(filter, "POSTAL_CODE", "MISMATCHING_VALUE")) {
    return;
  }

  for (let depth = LOOKUP_KEY_HIERARCHY.length - 1; depth > 0; depth--) {
    const rule = hierarchy[depth];
    if (rule !== undefined) {
      // Validate sub-region-specific postal code format: a sub-region
      // specifies the regular expression for a prefix of the postal code.
      const prefixMatcher = rule.postalCodeMatcher;
      if (prefixMatcher !== undefined) {
        if (!partiallyMatches(prefixMatcher, postalCode)) {
          report("POSTAL_CODE", "MISMATCHING_VALUE");
        }
        return;
      }
    }
  }
}

function checkUsesPoBox(
  address: AddressData,
  hierarchy: RuleHierarchy,
  allowPostal: boolean,
  filter: ValidationProblem[] | undefined,
  report: ReportFn,
): void {
  const countryRule = hierarchy[0]!;

  if (
    allowPostal ||
    !shouldReport(filter, "STREET_ADDRESS", "USES_P_O_BOX") ||
    isFieldEmpty(address, "STREET_ADDRESS")
  ) {
    return;
  }

  const matchers = getPostBoxMatchers(countryRule);
  for (const line of address.addressLine ?? []) {
    for (const matcher of matchers) {
      if (partiallyMatches(matcher, line)) {
        report("STREET_ADDRESS", "USES_P_O_BOX");
        return;
      }
    }
  }
}
