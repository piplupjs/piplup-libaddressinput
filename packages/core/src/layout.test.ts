// Ported from cpp/test/address_ui_test.cc (Apache-2.0, Google Inc.).

import { describe, expect, it } from "vitest";
import { buildLayout, getRegionCodes, type LayoutField } from "./layout.js";

const UI_LANGUAGE_TAG = "en";

function fields(layout: ReturnType<typeof buildLayout>): LayoutField[] {
  return layout.rows.flat().filter((item): item is LayoutField => item.kind === "field");
}

describe("buildLayout (AddressUiTest)", () => {
  it("returns an empty layout for an invalid region code (InvalidRegionCodeReturnsEmptyVector)", () => {
    const layout = buildLayout("INVALID-REGION-CODE", UI_LANGUAGE_TAG);
    expect(layout.rows).toEqual([]);
  });

  it("returns at most one field of each type for every region (UniqueFieldTypes)", () => {
    for (const regionCode of getRegionCodes()) {
      const layout = buildLayout(regionCode, UI_LANGUAGE_TAG);
      const seen = fields(layout).map((f) => f.field);
      expect(new Set(seen).size, `duplicate field in ${regionCode}`).toBe(seen.length);
    }
  });

  it("returns a non-empty layout for every supported region (ComponentsAreValid, partial)", () => {
    for (const regionCode of getRegionCodes()) {
      expect(buildLayout(regionCode, UI_LANGUAGE_TAG).rows.length, regionCode).toBeGreaterThan(0);
    }
  });

  // NOTE: upstream expects 4 newlines. Our data's LV `fmt` is
  // "%N%n%O%n%A%n%C, %Z" — 3 newlines — one line shorter than whatever
  // format production's test was written against (same fixture-vs-
  // production divergence noted throughout this project; verified via
  // `grep '^data/LV=' testdata/countryinfo.txt`).
  it("reads literals for LV: one comma-space and three line breaks (ComponentsWithLiteralsReadsLiteralsForLV, adjusted)", () => {
    const layout = buildLayout("LV", UI_LANGUAGE_TAG, { includeLiterals: true });
    // A row transition is our equivalent of upstream's "\n" literal count.
    expect(layout.rows.length - 1).toBe(3);
    const literals = layout.rows
      .flat()
      .filter((item) => item.kind === "literal")
      .map((item) => item.text);
    expect(literals).toEqual([", "]);
  });
});

describe("buildLayout: best address language (BestAddressLanguageTagTest, partial)", () => {
  const cases: [string, string, string, string][] = [
    // Armenia supports hy and has a Latin format.
    ["AM", "", "hy", "RECIPIENT"],
    ["AM", "hy", "hy", "RECIPIENT"],
    ["AM", "en", "hy-Latn", "RECIPIENT"],
    // P.R. China supports zh and has a Latin format. NOTE: upstream expects
    // best="zh" for these three; our data's CN `languages` is "zh-hans"
    // (not bare "zh" as production apparently has — same fixture-vs-
    // production divergence noted throughout), so the matched Language's
    // own tag is "zh-hans". Adjusted to match our data.
    ["CN", "zh-hans", "zh-hans", "POSTAL_CODE"],
    ["CN", "zh", "zh-hans", "POSTAL_CODE"],
    ["CN", "zh-cmn-Hans-CN", "zh-hans", "POSTAL_CODE"],
    ["CN", "zh-Latn", "zh-Latn", "RECIPIENT"],
    ["CN", "en", "zh-Latn", "RECIPIENT"],
    // Hong Kong supports zh-Hant and en. It has a Latin format. NOTE: our
    // data's HK `languages` is "zh-hant~en" (lowercase "hant"), so the
    // matched tag is "zh-hant", not production's properly-cased "zh-Hant".
    ["HK", "zh", "zh-hant", "ADMIN_AREA"],
    ["HK", "en", "en", "ADMIN_AREA"],
    ["HK", "zh-latn", "zh-Latn", "RECIPIENT"],
    ["HK", "fr", "zh-Latn", "RECIPIENT"],
    // Switzerland supports de, fr, and it.
    ["CH", "de", "de", "ORGANIZATION"],
    ["CH", "fr", "fr", "ORGANIZATION"],
    ["CH", "it", "it", "ORGANIZATION"],
    ["CH", "en", "de", "ORGANIZATION"],
  ];

  it.each(cases)(
    "%s ui=%j -> best=%j first=%s",
    (regionCode, uiLanguageTag, expectedBest, expectedFirstField) => {
      const layout = buildLayout(regionCode, uiLanguageTag);
      expect(layout.languageTag).toBe(expectedBest);
      const first = fields(layout)[0];
      expect(first?.field).toBe(expectedFirstField);
    },
  );
});
