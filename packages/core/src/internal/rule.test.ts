// Ported from cpp/test/rule_test.cc (Apache-2.0, Google Inc.).
//
// Only the literal-JSON test cases are ported here. Upstream's
// RuleParseTest.* suite is parameterized over every region in
// RegionDataConstants::GetRegionCodes() plus the default (ZZ) rule; that
// corpus isn't available until the fallback dataset lands (see
// .planning/PLAN.md Phase 2) and is better covered there / by the Phase 8
// golden tests than duplicated here.
//
// Note: this is a pure-function port (parseRule), not the mutable Rule
// class, so CopyFrom/CopyOverwritesRule has no equivalent — there's nothing
// to copy into, since each parseRule() call already returns a fresh object.

import { describe, expect, it } from "vitest";
import { fieldElement } from "./format-element.js";
import { parseJsonRule, parseRule, type NameTypeMessageId } from "./rule.js";

describe("parseRule", () => {
  it("returns undefined for an empty string (EmptyStringIsNotValid)", () => {
    expect(parseRule("")).toBeUndefined();
  });

  it("parses an empty dictionary (EmptyDictionaryIsValid)", () => {
    expect(parseRule("{}")).toBeDefined();
  });

  it("overwrites fields on each parse (ParseOverwritesRule)", () => {
    const first = parseRule(
      JSON.stringify({
        fmt: "%S%Z",
        state_name_type: "area",
        zip: "1234",
        zip_name_type: "postal",
        zipex: "1234",
        posturl: "http://www.testpost.com",
      }),
    )!;
    expect(first.format).not.toEqual([]);
    expect(first.adminAreaNameMessageId).toBe("IDS_LIBADDRESSINPUT_AREA");
    expect(first.postalCodeNameMessageId).toBe("IDS_LIBADDRESSINPUT_POSTAL_CODE_LABEL");
    expect(first.solePostalCode).toBe("1234");
    expect(first.postalCodeExample).toBe("1234");
    expect(first.postServiceUrl).toBe("http://www.testpost.com");

    const second = parseRule(
      JSON.stringify({
        fmt: "",
        state_name_type: "do_si",
        zip_name_type: "zip",
        zipex: "5678",
        posturl: "http://www.fakepost.com",
      }),
    )!;
    expect(second.format).toEqual([]);
    expect(second.adminAreaNameMessageId).toBe("IDS_LIBADDRESSINPUT_DO_SI");
    expect(second.postalCodeNameMessageId).toBe("IDS_LIBADDRESSINPUT_ZIP_CODE_LABEL");
    expect(second.solePostalCode).toBe("");
    expect(second.postalCodeExample).toBe("5678");
    expect(second.postServiceUrl).toBe("http://www.fakepost.com");
  });

  it("parses the format correctly (ParsesFormatCorrectly)", () => {
    const rule = parseRule(JSON.stringify({ fmt: "%S%C" }))!;
    expect(rule.format).toEqual([fieldElement("ADMIN_AREA"), fieldElement("LOCALITY")]);
  });

  it("parses the name correctly (ParsesNameCorrectly)", () => {
    expect(parseRule(JSON.stringify({ name: "Le Test" }))!.name).toBe("Le Test");
  });

  it("parses the Latin name correctly (ParsesLatinNameCorrectly)", () => {
    expect(parseRule(JSON.stringify({ lname: "Testistan" }))!.latinName).toBe(
      "Testistan",
    );
  });

  it("parses the Latin format correctly (ParsesLatinFormatCorrectly)", () => {
    const rule = parseRule(JSON.stringify({ lfmt: "%C%S" }))!;
    expect(rule.latinFormat).toEqual([
      fieldElement("LOCALITY"),
      fieldElement("ADMIN_AREA"),
    ]);
  });

  it("parses required fields correctly (ParsesRequiredCorrectly)", () => {
    const rule = parseRule(JSON.stringify({ require: "AC" }))!;
    expect(rule.required).toEqual(["STREET_ADDRESS", "LOCALITY"]);
  });

  it("parses sub_keys correctly (ParsesSubKeysCorrectly)", () => {
    const rule = parseRule(JSON.stringify({ sub_keys: "aa~bb~cc" }))!;
    expect(rule.subKeys).toEqual(["aa", "bb", "cc"]);
  });

  it("parses languages correctly (ParsesLanguagesCorrectly)", () => {
    const rule = parseRule(JSON.stringify({ languages: "de~fr~it" }))!;
    expect(rule.languages).toEqual(["de", "fr", "it"]);
  });

  it("parses the postal code example correctly (ParsesPostalCodeExampleCorrectly)", () => {
    const rule = parseRule(JSON.stringify({ zipex: "1234,12345-6789" }))!;
    expect(rule.postalCodeExample).toBe("1234,12345-6789");
  });

  it("parses the post service URL correctly (ParsesPostServiceUrlCorrectly)", () => {
    const rule = parseRule(JSON.stringify({ posturl: "http://www.testpost.com" }))!;
    expect(rule.postServiceUrl).toBe("http://www.testpost.com");
  });

  it("compiles a postal code matcher (PostalCodeMatcher)", () => {
    const rule = parseRule(JSON.stringify({ zip: "\\d{3}" }))!;
    expect(rule.postalCodeMatcher).toBeInstanceOf(RegExp);
  });

  it("leaves the matcher undefined for an invalid regexp (PostalCodeMatcherInvalidRegExp)", () => {
    const rule = parseRule(JSON.stringify({ zip: "(" }))!;
    expect(rule.postalCodeMatcher).toBeUndefined();
  });

  it("parses an already-decoded object (ParsesJsonRuleCorrectly)", () => {
    const rule = parseJsonRule({ zip: "\\d{3}" });
    expect(rule.postalCodeMatcher).toBeInstanceOf(RegExp);
  });

  it("recognizes and copies the sole postal code (SolePostalCode)", () => {
    const rule = parseRule(JSON.stringify({ zip: "1234" }))!;
    expect(rule.postalCodeMatcher).toBeInstanceOf(RegExp);
    expect(rule.solePostalCode).toBe("1234");
  });
});

describe("parseRule name-type message ids", () => {
  const postalCodeCases: [string, NameTypeMessageId][] = [
    ["pin", "IDS_LIBADDRESSINPUT_PIN_CODE_LABEL"],
    ["postal", "IDS_LIBADDRESSINPUT_POSTAL_CODE_LABEL"],
    ["zip", "IDS_LIBADDRESSINPUT_ZIP_CODE_LABEL"],
  ];
  it.each(postalCodeCases)("zip_name_type %s (AllPostalCodeNames)", (type, id) => {
    expect(
      parseRule(JSON.stringify({ zip_name_type: type }))!.postalCodeNameMessageId,
    ).toBe(id);
  });

  const localityCases: [string, NameTypeMessageId][] = [
    ["post_town", "IDS_LIBADDRESSINPUT_POST_TOWN"],
    ["city", "IDS_LIBADDRESSINPUT_LOCALITY_LABEL"],
    ["district", "IDS_LIBADDRESSINPUT_DISTRICT"],
  ];
  it.each(localityCases)("locality_name_type %s (AllLocalityNames)", (type, id) => {
    expect(
      parseRule(JSON.stringify({ locality_name_type: type }))!.localityNameMessageId,
    ).toBe(id);
  });

  const sublocalityCases: [string, NameTypeMessageId][] = [
    ["village_township", "IDS_LIBADDRESSINPUT_VILLAGE_TOWNSHIP"],
    ["neighborhood", "IDS_LIBADDRESSINPUT_NEIGHBORHOOD"],
    ["suburb", "IDS_LIBADDRESSINPUT_SUBURB"],
    ["district", "IDS_LIBADDRESSINPUT_DISTRICT"],
  ];
  it.each(sublocalityCases)(
    "sublocality_name_type %s (AllSublocalityNames)",
    (type, id) => {
      expect(
        parseRule(JSON.stringify({ sublocality_name_type: type }))!
          .sublocalityNameMessageId,
      ).toBe(id);
    },
  );

  const adminAreaCases: [string, NameTypeMessageId][] = [
    ["area", "IDS_LIBADDRESSINPUT_AREA"],
    ["county", "IDS_LIBADDRESSINPUT_COUNTY"],
    ["department", "IDS_LIBADDRESSINPUT_DEPARTMENT"],
    ["district", "IDS_LIBADDRESSINPUT_DISTRICT"],
    ["do_si", "IDS_LIBADDRESSINPUT_DO_SI"],
    ["emirate", "IDS_LIBADDRESSINPUT_EMIRATE"],
    ["island", "IDS_LIBADDRESSINPUT_ISLAND"],
    ["parish", "IDS_LIBADDRESSINPUT_PARISH"],
    ["prefecture", "IDS_LIBADDRESSINPUT_PREFECTURE"],
    ["province", "IDS_LIBADDRESSINPUT_PROVINCE"],
    ["state", "IDS_LIBADDRESSINPUT_STATE"],
  ];
  it.each(adminAreaCases)("state_name_type %s (AllAdminAreaNames)", (type, id) => {
    expect(
      parseRule(JSON.stringify({ state_name_type: type }))!.adminAreaNameMessageId,
    ).toBe(id);
  });
});
