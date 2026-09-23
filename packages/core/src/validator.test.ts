// Ported from cpp/test/address_validator_test.cc (Apache-2.0, Google Inc.).
//
// Parametrized over both supplier kinds, like upstream. PreloadSupplier
// cases pick up extra UNSUPPORTED_FIELD problems for LOCALITY/
// DEPENDENT_LOCALITY on regions where our bundled testdata/countryinfo.txt
// fixture only has admin-area-level data (see .planning/PLAN.md's notes on
// GetLoadedRuleDepth) — this matches upstream's OWN PreloadSupplier-based
// test expectations exactly, since upstream's tests run against the very
// same OSS fixture (via TestdataSource) for this particular test file.

import { describe, expect, it } from "vitest";
import { FallbackAggregateSource, FallbackDataSource } from "../test/fake-sources.js";
import type { AddressData } from "./address-data.js";
import { NullStorage } from "./storage.js";
import { OndemandSupplier } from "./supplier/ondemand.js";
import { PreloadSupplier } from "./supplier/preload.js";
import type { Supplier } from "./supplier/supplier.js";
import { validate, type ValidationProblem } from "./validator.js";

type SupplierKind = "preload" | "ondemand";

async function makeSupplier(kind: SupplierKind, regionCode?: string): Promise<Supplier> {
  if (kind === "preload") {
    const supplier = new PreloadSupplier(new FallbackAggregateSource(), new NullStorage());
    if (regionCode !== undefined && regionCode.length > 0) {
      const result = await supplier.loadRules(regionCode);
      if (!result.success) throw new Error(`failed to load ${regionCode}`);
    }
    return supplier;
  }
  return new OndemandSupplier(new FallbackDataSource(), new NullStorage());
}

const SUPPLIER_KINDS: SupplierKind[] = ["preload", "ondemand"];

// Upstream's expected_/problems_ are std::multimap<AddressField,AddressProblem>,
// which EXPECT_EQ compares by sorted key order — not by insertion order. Our
// ValidationProblem[] preserves insertion (check) order instead, so a literal
// port of the C++ tests' listed order isn't meaningful; sort both sides the
// same way before comparing, matching multimap's actual equality semantics.
function sortProblems(problems: ValidationProblem[]): ValidationProblem[] {
  return [...problems].sort((a, b) => {
    const byField = a.field.localeCompare(b.field);
    return byField !== 0 ? byField : a.problem.localeCompare(b.problem);
  });
}

function expectSameProblems(actual: ValidationProblem[], expected: ValidationProblem[]): void {
  expect(sortProblems(actual)).toEqual(sortProblems(expected));
}

describe("validate (AddressValidatorTest)", () => {
  it.each(SUPPLIER_KINDS)("reports MISSING_REQUIRED_FIELD for an empty address [%s] (EmptyAddress)", async (kind) => {
    const supplier = await makeSupplier(kind);
    const problems = await validate(supplier, { regionCode: "" });
    expectSameProblems(problems, [{ field: "COUNTRY", problem: "MISSING_REQUIRED_FIELD" }]);
  });

  it.each(SUPPLIER_KINDS)("reports UNKNOWN_VALUE for an invalid country [%s] (InvalidCountry)", async (kind) => {
    const supplier = await makeSupplier(kind, "QZ");
    const problems = await validate(supplier, { regionCode: "QZ" });
    expectSameProblems(problems, [{ field: "COUNTRY", problem: "UNKNOWN_VALUE" }]);
  });

  it.each(SUPPLIER_KINDS)("accepts a valid US address [%s] (ValidAddressUS)", async (kind) => {
    const supplier = await makeSupplier(kind, "US");
    const address: AddressData = {
      regionCode: "US",
      addressLine: ["1600 Amphitheatre Parkway"],
      administrativeArea: "CA",
      locality: "Mountain View",
      postalCode: "94043",
      languageCode: "en",
    };
    const problems = await validate(supplier, address);
    const expected: ValidationProblem[] =
      kind === "preload"
        ? [
            { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
            { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
          ]
        : [];
    expectSameProblems(problems, expected);
  });

  it.each(SUPPLIER_KINDS)("flags a minimal US address [%s] (InvalidAddressUS)", async (kind) => {
    const supplier = await makeSupplier(kind, "US");
    const address: AddressData = { regionCode: "US", postalCode: "123" };
    const problems = await validate(supplier, address);
    const expected: ValidationProblem[] = [
      { field: "ADMIN_AREA", problem: "MISSING_REQUIRED_FIELD" },
      { field: "LOCALITY", problem: "MISSING_REQUIRED_FIELD" },
      { field: "STREET_ADDRESS", problem: "MISSING_REQUIRED_FIELD" },
      { field: "POSTAL_CODE", problem: "INVALID_FORMAT" },
    ];
    if (kind === "preload") {
      expected.push(
        { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
        { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
      );
    }
    expectSameProblems(problems, expected);
  });

  it.each(SUPPLIER_KINDS)("accepts a valid CH address [%s] (ValidAddressCH)", async (kind) => {
    const supplier = await makeSupplier(kind, "CH");
    const address: AddressData = {
      regionCode: "CH",
      addressLine: ["Brandschenkestrasse 110"],
      locality: "ZH",
      postalCode: "8002",
      languageCode: "de",
    };
    const problems = await validate(supplier, address);
    const expected: ValidationProblem[] =
      kind === "preload"
        ? [
            { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
            { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
          ]
        : [];
    expectSameProblems(problems, expected);
  });

  it.each(SUPPLIER_KINDS)("flags a minimal CH address [%s] (InvalidAddressCH)", async (kind) => {
    const supplier = await makeSupplier(kind, "CH");
    const address: AddressData = { regionCode: "CH", postalCode: "123" };
    const problems = await validate(supplier, address);
    const expected: ValidationProblem[] = [
      { field: "STREET_ADDRESS", problem: "MISSING_REQUIRED_FIELD" },
      { field: "POSTAL_CODE", problem: "INVALID_FORMAT" },
      { field: "LOCALITY", problem: "MISSING_REQUIRED_FIELD" },
    ];
    if (kind === "preload") {
      expected.push(
        { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
        { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
      );
    }
    expectSameProblems(problems, expected);
  });

  it.each(SUPPLIER_KINDS)("accepts a valid MX address [%s] (ValidPostalCodeMX)", async (kind) => {
    const supplier = await makeSupplier(kind, "MX");
    const address: AddressData = {
      regionCode: "MX",
      addressLine: ["Av Gregorio Méndez Magaña 1400"],
      administrativeArea: "TAB",
      locality: "Villahermosa",
      postalCode: "86070",
      languageCode: "es",
    };
    const problems = await validate(supplier, address);
    const expected: ValidationProblem[] =
      kind === "preload"
        ? [
            { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
            { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
          ]
        : [];
    expectSameProblems(problems, expected);
  });

  it.each(SUPPLIER_KINDS)("flags a mismatching MX postal code [%s] (MismatchingPostalCodeMX)", async (kind) => {
    const supplier = await makeSupplier(kind, "MX");
    const address: AddressData = {
      regionCode: "MX",
      addressLine: ["Av Gregorio Méndez Magaña 1400"],
      administrativeArea: "TAB",
      locality: "Villahermosa",
      postalCode: "80000",
      languageCode: "es",
    };
    const problems = await validate(supplier, address);
    const expected: ValidationProblem[] = [
      { field: "POSTAL_CODE", problem: "MISMATCHING_VALUE" },
    ];
    if (kind === "preload") {
      expected.push(
        { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
        { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
      );
    }
    expectSameProblems(problems, expected);
  });

  it.each(SUPPLIER_KINDS)("honors a filter [%s] (ValidateFilter)", async (kind) => {
    const supplier = await makeSupplier(kind, "CH");
    const address: AddressData = { regionCode: "CH", postalCode: "123" };
    const problems = await validate(supplier, address, {
      filter: [{ field: "POSTAL_CODE", problem: "INVALID_FORMAT" }],
    });
    expectSameProblems(problems, [{ field: "POSTAL_CODE", problem: "INVALID_FORMAT" }]);
  });

  // NOTE: upstream's expected_ for these two JP cases doesn't include
  // (LOCALITY, MISSING_REQUIRED_FIELD), because production JP data doesn't
  // require LOCALITY. Our bundled testdata/countryinfo.txt fixture's JP
  // entry has `"require":"ACSZ"` (includes "C" = LOCALITY) — verified with
  // `grep '^data/JP=' testdata/countryinfo.txt`  — so with the data we
  // actually ship, LOCALITY genuinely is required and empty here (neither
  // address sets .locality, only .administrativeArea). Same
  // fixture-vs-production divergence already documented in Phases 2/3;
  // expected values below match our real data.
  it.each(SUPPLIER_KINDS)("validates a Kanji JP address [%s] (ValidKanjiAddressJP)", async (kind) => {
    const supplier = await makeSupplier(kind, "JP");
    const address: AddressData = {
      regionCode: "JP",
      addressLine: ["徳島市..."],
      administrativeArea: "徳島県",
      postalCode: "770-0847",
      languageCode: "ja",
    };
    const problems = await validate(supplier, address);
    const expected: ValidationProblem[] = [
      { field: "LOCALITY", problem: "MISSING_REQUIRED_FIELD" },
    ];
    if (kind === "preload") {
      expected.push(
        { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
        { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
      );
    }
    expectSameProblems(problems, expected);
  });

  // The following resolve a Latin-script or natural-language sub-region
  // name to its canonical key via PreloadSupplier's name index — that
  // requires the whole region preloaded, so (matching upstream) these are
  // preload-only.

  it("validates a Latin-script JP address [preload] (ValidLatinAddressJP)", async () => {
    const supplier = await makeSupplier("preload", "JP");
    const address: AddressData = {
      regionCode: "JP",
      addressLine: ["...Tokushima"],
      administrativeArea: "Tokushima",
      postalCode: "770-0847",
      languageCode: "ja-Latn",
    };
    const problems = await validate(supplier, address);
    expectSameProblems(problems, [
      { field: "LOCALITY", problem: "MISSING_REQUIRED_FIELD" },
      { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
      { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
    ]);
  });

  it("validates a BR address by natural-language sub-region name [preload] (ValidAddressBR)", async () => {
    const supplier = await makeSupplier("preload", "BR");
    const address: AddressData = {
      regionCode: "BR",
      addressLine: ["Rodovia Raposo Tavares, 6388-6682"],
      administrativeArea: "São Paulo",
      locality: "Presidente Prudente",
      postalCode: "19063-008",
      languageCode: "pt",
    };
    const problems = await validate(supplier, address);
    expectSameProblems(problems, [{ field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" }]);
  });

  it("validates a CA address in English [preload] (ValidAddressCA_en)", async () => {
    const supplier = await makeSupplier("preload", "CA");
    const address: AddressData = {
      regionCode: "CA",
      addressLine: ["..."],
      administrativeArea: "New Brunswick",
      locality: "Saint John County",
      postalCode: "E2L 4Z6",
      languageCode: "en",
    };
    const problems = await validate(supplier, address);
    expectSameProblems(problems, [
      { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
      { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
    ]);
  });

  it("validates a CA address in French [preload] (ValidAddressCA_fr)", async () => {
    const supplier = await makeSupplier("preload", "CA");
    const address: AddressData = {
      regionCode: "CA",
      addressLine: ["..."],
      administrativeArea: "Nouveau-Brunswick",
      locality: "Comté de Saint-Jean",
      postalCode: "E2L 4Z6",
      languageCode: "fr",
    };
    const problems = await validate(supplier, address);
    expectSameProblems(problems, [
      { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
      { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
    ]);
  });
});

describe("validate: supplier failure", () => {
  it("returns no problems when the supplier fails to resolve a hierarchy", async () => {
    const failingSupplier: Supplier = {
      async supply(lookupKey) {
        return { success: false, lookupKey, hierarchy: [] };
      },
      async supplyGlobally(lookupKey) {
        return { success: false, lookupKey, hierarchy: [] };
      },
      getLoadedRuleDepth: () => 0,
    };
    const problems = await validate(failingSupplier, { regionCode: "US" });
    expectSameProblems(problems, []);
  });
});
