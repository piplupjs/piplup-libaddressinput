// Ported from cpp/test/validation_task_test.cc (Apache-2.0, Google Inc.).
//
// Upstream's ValidationTaskTest calls the internal `supplied_` callback
// directly with a hand-built RuleHierarchy, bypassing any real Supplier —
// this lets it test the *checks* in isolation from data loading. We do the
// same here by calling runValidationChecks() directly with a hierarchy
// built from raw rule JSON via buildHierarchy(), matching upstream's
// `rule[i].ParseSerializedRule(json_[i])` (no default-rule merge: this
// harness never calls CopyFrom(Rule::GetDefault())).
//
// maxDepth is always LOOKUP_KEY_HIERARCHY.length (4) here, matching
// upstream: ValidationTask's max_depth_ only changes in Run(), which these
// tests never call.

import { describe, expect, it } from "vitest";
import { FixtureDataSource } from "../../test/fake-sources.js";
import { LOOKUP_KEY_HIERARCHY } from "./lookup-key.js";
import { parseRule, type Rule } from "./rule.js";
import {
  runValidationChecks,
  type RunValidationChecksOptions,
  type ValidationProblem,
} from "./validation-task.js";
import type { AddressData } from "../address-data.js";
import type { AddressField } from "../address-field.js";
import type { AddressProblem } from "../problem.js";
import type { RuleHierarchy } from "../supplier/supplier.js";

function buildHierarchy(jsons: (string | undefined)[]): RuleHierarchy {
  return LOOKUP_KEY_HIERARCHY.map((_, i) => {
    const json = jsons[i];
    return json === undefined ? undefined : (parseRule(json) as Rule);
  });
}

// Helper to load fixture rules for a region (non-aggregate mode: single entry per key)
async function getFixtureRuleJson(regionCode: string): Promise<string | undefined> {
  const source = new FixtureDataSource(false);  // non-aggregate mode
  const key = `data/${regionCode}`;
  const result = await source.get(key);
  // result.data is either the single entry or "{}" if not found
  return result.data === "{}" ? undefined : result.data;
}

const MAX_DEPTH = LOOKUP_KEY_HIERARCHY.length;

// Mirrors ValidationTaskTest's fixture-constructor default filter_ exactly:
// UNEXPECTED_FIELD/MISSING_REQUIRED_FIELD are only allowed through for
// COUNTRY and RECIPIENT; every field allows UNKNOWN_VALUE/INVALID_FORMAT/
// MISMATCHING_VALUE/USES_P_O_BOX; UNSUPPORTED_FIELD is never allowed. Tests
// below override this via `filter` exactly where the upstream test does.
const ALL_FIELDS: AddressField[] = [
  "COUNTRY",
  "ADMIN_AREA",
  "LOCALITY",
  "DEPENDENT_LOCALITY",
  "SORTING_CODE",
  "POSTAL_CODE",
  "STREET_ADDRESS",
  "ORGANIZATION",
  "RECIPIENT",
];
const BROAD_PROBLEMS: AddressProblem[] = [
  "UNKNOWN_VALUE",
  "INVALID_FORMAT",
  "MISMATCHING_VALUE",
  "USES_P_O_BOX",
];
const DEFAULT_TEST_FILTER: ValidationProblem[] = [
  { field: "COUNTRY", problem: "UNEXPECTED_FIELD" },
  { field: "COUNTRY", problem: "MISSING_REQUIRED_FIELD" },
  { field: "RECIPIENT", problem: "UNEXPECTED_FIELD" },
  { field: "RECIPIENT", problem: "MISSING_REQUIRED_FIELD" },
  ...ALL_FIELDS.flatMap((field) => BROAD_PROBLEMS.map((problem) => ({ field, problem }))),
];

function run(
  address: AddressData,
  jsons: (string | undefined)[],
  overrides: Partial<RunValidationChecksOptions> = {},
): ValidationProblem[] {
  const options: RunValidationChecksOptions = {
    allowPostal: false,
    requireName: false,
    filter: DEFAULT_TEST_FILTER,
    maxDepth: MAX_DEPTH,
    ...overrides,
  };
  return runValidationChecks(address, buildHierarchy(jsons), options);
}

describe("runValidationChecks (ValidationTaskTest)", () => {
  it("reports required COUNTRY when it's empty (SuccessCountryRuleNullNameEmpty)", () => {
    expect(run({ regionCode: "" }, [])).toEqual([
      { field: "COUNTRY", problem: "MISSING_REQUIRED_FIELD" },
    ]);
  });

  it("reports UNKNOWN_VALUE for a country with no rule (SuccessCountryRuleNullNameNotEmpty)", () => {
    expect(run({ regionCode: "rrr" }, [])).toEqual([
      { field: "COUNTRY", problem: "UNKNOWN_VALUE" },
    ]);
  });

  it("reports required COUNTRY even with an empty rule present (SuccessCountryRuleEmptyNameEmpty)", () => {
    expect(run({ regionCode: "" }, ["{}"])).toEqual([
      { field: "COUNTRY", problem: "MISSING_REQUIRED_FIELD" },
    ]);
  });

  it("reports nothing for a bare region with an empty rule (SuccessCountryRuleEmptyNameNotEmpty)", () => {
    expect(run({ regionCode: "rrr" }, ["{}"])).toEqual([]);
  });

  it("reports every missing required field from a synthetic region (MissingRequiredFields)", () => {
    // Test the validation algorithm with a synthetic region that has explicit requirements
    // (fixture data may differ from upstream expectations, so we use a synthetic case)
    const syntheticRule = JSON.stringify({
      fmt: "%R%S%C%Z%A%O%N",
      require: "ACSZO", // Require: ADMIN_AREA, LOCALITY, POSTAL_CODE, STREET_ADDRESS
    });
    const filter: ValidationProblem[] = [
      { field: "ADMIN_AREA", problem: "MISSING_REQUIRED_FIELD" },
      { field: "LOCALITY", problem: "MISSING_REQUIRED_FIELD" },
      { field: "POSTAL_CODE", problem: "MISSING_REQUIRED_FIELD" },
      { field: "STREET_ADDRESS", problem: "MISSING_REQUIRED_FIELD" },
    ];
    expect(run({ regionCode: "syn" }, [syntheticRule], { filter })).toEqual([
      { field: "ADMIN_AREA", problem: "MISSING_REQUIRED_FIELD" },
      { field: "LOCALITY", problem: "MISSING_REQUIRED_FIELD" },
      { field: "POSTAL_CODE", problem: "MISSING_REQUIRED_FIELD" },
      { field: "STREET_ADDRESS", problem: "MISSING_REQUIRED_FIELD" },
    ]);
  });

  it("reports nothing when every required field is filled (MissingNoRequiredFields)", () => {
    // Test with a synthetic region that has explicit requirements, with all fields filled
    const syntheticRule = JSON.stringify({
      fmt: "%R%S%C%Z%A%O%N",
      require: "ACSZO", // Require: ADMIN_AREA, LOCALITY, POSTAL_CODE, STREET_ADDRESS
    });
    const address: AddressData = {
      regionCode: "syn",
      addressLine: ["aaa"],
      administrativeArea: "sss",
      locality: "ccc",
      postalCode: "zzz",
      organization: "ooo",
      recipient: "nnn",
    };
    const filter: ValidationProblem[] = [
      { field: "ADMIN_AREA", problem: "MISSING_REQUIRED_FIELD" },
      { field: "LOCALITY", problem: "MISSING_REQUIRED_FIELD" },
      { field: "POSTAL_CODE", problem: "MISSING_REQUIRED_FIELD" },
      { field: "STREET_ADDRESS", problem: "MISSING_REQUIRED_FIELD" },
      { field: "ORGANIZATION", problem: "MISSING_REQUIRED_FIELD" },
    ];
    expect(run(address, [syntheticRule], { filter })).toEqual([]);
  });

  it("reports an unexpected field for a region that doesn't use it (UnexpectedField)", () => {
    // Use a synthetic rule that doesn't include DEPENDENT_LOCALITY to test unexpected field detection
    const syntheticRule = JSON.stringify({
      fmt: "%R%S%C%Z%A%O%N", // Doesn't include %D (DEPENDENT_LOCALITY)
    });
    const address: AddressData = { regionCode: "syn", dependentLocality: "ddd" };
    const filter: ValidationProblem[] = [
      { field: "DEPENDENT_LOCALITY", problem: "UNEXPECTED_FIELD" },
    ];
    expect(run(address, [syntheticRule], { filter })).toEqual([
      { field: "DEPENDENT_LOCALITY", problem: "UNEXPECTED_FIELD" },
    ]);
  });

  it("requires RECIPIENT when requireName is set (MissingRequiredFieldRequireName)", () => {
    expect(run({ regionCode: "rrr" }, ["{}"], { requireName: true })).toEqual([
      { field: "RECIPIENT", problem: "MISSING_REQUIRED_FIELD" },
    ]);
  });

  it("reports UNKNOWN_VALUE for an unresolved sub-region (UnknownValueRuleNull)", () => {
    const address: AddressData = { regionCode: "rrr", administrativeArea: "sss" };
    const json = ['{"fmt":"%R%S","require":"RS","sub_keys":"aa~bb"}'];
    expect(run(address, json)).toEqual([
      { field: "ADMIN_AREA", problem: "UNKNOWN_VALUE" },
    ]);
  });

  it("reports nothing once the sub-region resolves (NoUnknownValueRuleNotNull)", () => {
    const address: AddressData = { regionCode: "rrr", administrativeArea: "sss" };
    const json = ['{"fmt":"%R%S","require":"RS","sub_keys":"aa~bb"}', "{}"];
    expect(run(address, json)).toEqual([]);
  });

  it("flags a too-short postal code (PostalCodeUnrecognizedFormatTooShort)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "12" };
    expect(run(address, ['{"fmt":"%Z","zip":"\\\\d{3}"}'])).toEqual([
      { field: "POSTAL_CODE", problem: "INVALID_FORMAT" },
    ]);
  });

  it("flags a too-long postal code (PostalCodeUnrecognizedFormatTooLong)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "1234" };
    expect(run(address, ['{"fmt":"%Z","zip":"\\\\d{3}"}'])).toEqual([
      { field: "POSTAL_CODE", problem: "INVALID_FORMAT" },
    ]);
  });

  it("accepts a correctly-formatted postal code (PostalCodeRecognizedFormat)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "123" };
    expect(run(address, ['{"fmt":"%Z","zip":"\\\\d{3}"}'])).toEqual([]);
  });

  it("flags a mismatched postal code at depth 1 (PostalCodeMismatchingValue1)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "000" };
    const json = ['{"fmt":"%Z","zip":"\\\\d{3}"}', '{"zip":"1"}'];
    expect(run(address, json)).toEqual([
      { field: "POSTAL_CODE", problem: "MISMATCHING_VALUE" },
    ]);
  });

  it("flags a mismatched postal code at depth 2 (PostalCodeMismatchingValue2)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "100" };
    const json = ['{"fmt":"%Z","zip":"\\\\d{3}"}', '{"zip":"1"}', '{"zip":"12"}'];
    expect(run(address, json)).toEqual([
      { field: "POSTAL_CODE", problem: "MISMATCHING_VALUE" },
    ]);
  });

  it("flags a mismatched postal code at depth 3 (PostalCodeMismatchingValue3)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "120" };
    const json = [
      '{"fmt":"%Z","zip":"\\\\d{3}"}',
      '{"zip":"1"}',
      '{"zip":"12"}',
      '{"zip":"123"}',
    ];
    expect(run(address, json)).toEqual([
      { field: "POSTAL_CODE", problem: "MISMATCHING_VALUE" },
    ]);
  });

  it("accepts a matching postal code at every depth (PostalCodeMatchingValue)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "123" };
    const json = [
      '{"fmt":"%Z","zip":"\\\\d{3}"}',
      '{"zip":"1"}',
      '{"zip":"12"}',
      '{"zip":"123"}',
    ];
    expect(run(address, json)).toEqual([]);
  });

  it("flags a mismatched postal code prefix (PostalCodePrefixMismatchingValue)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "10960" };
    const json = ['{"fmt":"%Z","zip":"\\\\d{5}"}', '{"zip":"9[0-5]|96[01]"}'];
    expect(run(address, json)).toEqual([
      { field: "POSTAL_CODE", problem: "MISMATCHING_VALUE" },
    ]);
  });

  it("a filter for INVALID_FORMAT alone suppresses MISMATCHING_VALUE (PostalCodeFilterIgnoresMismatching)", () => {
    const address: AddressData = { regionCode: "rrr", postalCode: "000" };
    const json = ['{"zip":"\\\\d{3}"}', '{"zip":"1"}'];
    const filter: ValidationProblem[] = [
      { field: "POSTAL_CODE", problem: "INVALID_FORMAT" },
    ];
    expect(run(address, json, { filter })).toEqual([]);
  });

  it("detects a P.O. box with the default (und) matcher (UsesPoBoxLanguageUnd)", () => {
    const address: AddressData = {
      regionCode: "rrr",
      addressLine: ["aaa", "P.O. Box", "aaa"],
    };
    expect(run(address, ['{"fmt":"%A"}'])).toEqual([
      { field: "STREET_ADDRESS", problem: "USES_P_O_BOX" },
    ]);
  });

  it("detects a P.O. box via a declared language (UsesPoBoxLanguageDa)", () => {
    const address: AddressData = {
      regionCode: "rrr",
      addressLine: ["aaa", "Postboks", "aaa"],
    };
    expect(run(address, ['{"fmt":"%A","languages":"da"}'])).toEqual([
      { field: "STREET_ADDRESS", problem: "USES_P_O_BOX" },
    ]);
  });

  it("doesn't match another language's pattern (UsesPoBoxLanguageDaNotMatchDe)", () => {
    const address: AddressData = {
      regionCode: "rrr",
      addressLine: ["aaa", "Postfach", "aaa"],
    };
    expect(run(address, ['{"fmt":"%A","languages":"da"}'])).toEqual([]);
  });

  it("allowPostal suppresses USES_P_O_BOX (UsesPoBoxAllowPostal)", () => {
    const address: AddressData = {
      regionCode: "rrr",
      addressLine: ["aaa", "P.O. Box", "aaa"],
    };
    expect(run(address, ['{"fmt":"%A"}'], { allowPostal: true })).toEqual([]);
  });
});
