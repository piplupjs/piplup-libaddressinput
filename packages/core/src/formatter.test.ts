// Ported from cpp/test/address_formatter_test.cc (Apache-2.0, Google Inc.).

import { describe, expect, it } from "vitest";
import type { AddressData } from "./address-data.js";
import {
  formatAddress,
  formatAddressAsSingleLine,
  getStreetAddressLinesAsSingleLine,
} from "./formatter.js";

describe("getStreetAddressLinesAsSingleLine", () => {
  it("is empty for an empty address (EmptyAddress)", () => {
    expect(getStreetAddressLinesAsSingleLine({ regionCode: "" })).toBe("");
  });

  it("returns the line as-is for one line (1Line)", () => {
    const address: AddressData = { regionCode: "US", addressLine: ["Line 1"] };
    expect(getStreetAddressLinesAsSingleLine(address)).toBe("Line 1");
    expect(getStreetAddressLinesAsSingleLine({ ...address, languageCode: "en" })).toBe(
      "Line 1",
    );
    expect(
      getStreetAddressLinesAsSingleLine({ ...address, languageCode: "zh-Hans" }),
    ).toBe("Line 1");
  });

  it("picks a language-appropriate separator for two lines (2Lines)", () => {
    const address: AddressData = {
      regionCode: "US",
      addressLine: ["Line 1", "Line 2"],
    };
    expect(getStreetAddressLinesAsSingleLine(address)).toBe("Line 1, Line 2");
    expect(getStreetAddressLinesAsSingleLine({ ...address, languageCode: "en" })).toBe(
      "Line 1, Line 2",
    );
    expect(
      getStreetAddressLinesAsSingleLine({ ...address, languageCode: "zh-Hans" }),
    ).toBe("Line 1Line 2");
    expect(getStreetAddressLinesAsSingleLine({ ...address, languageCode: "ko" })).toBe(
      "Line 1 Line 2",
    );
    expect(getStreetAddressLinesAsSingleLine({ ...address, languageCode: "ar" })).toBe(
      "Line 1، Line 2",
    );
  });

  it("joins five lines with commas (5Lines)", () => {
    const address: AddressData = {
      regionCode: "US",
      addressLine: ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"],
      languageCode: "fr",
    };
    expect(getStreetAddressLinesAsSingleLine(address)).toBe(
      "Line 1, Line 2, Line 3, Line 4, Line 5",
    );
  });
});

describe("formatAddress", () => {
  it("formats a local-language NZ address (GetFormattedNationalAddressLocalLanguage)", () => {
    const address: AddressData = {
      regionCode: "NZ",
      addressLine: ["Rotopapa", "Irwell 3RD"],
      locality: "Leeston",
      postalCode: "8704",
    };
    const expected = ["Rotopapa", "Irwell 3RD", "Leeston 8704"];
    expect(formatAddress(address)).toEqual(expected);

    // Should be the same result regardless of language.
    const withLanguage = { ...address, languageCode: "en-Latn-CN" };
    expect(formatAddress(withLanguage)).toEqual(expected);
    expect(formatAddressAsSingleLine(withLanguage)).toBe(
      "Rotopapa, Irwell 3RD, Leeston 8704",
    );
  });

  it("uses the Latin format for a Latin-tagged TW address (GetFormattedNationalAddressLatinFormat)", () => {
    const taiwanCity = "大安區";
    const taiwanAdmin = "台北市";
    const taiwanStreetLine = "台灣信義路三段33號";
    const postalCode = "106";

    const address: AddressData = {
      regionCode: "TW",
      addressLine: [taiwanStreetLine],
      administrativeArea: taiwanAdmin,
      locality: taiwanCity,
      postalCode,
      languageCode: "zh-Hant",
    };
    const expected = [postalCode, taiwanAdmin + taiwanCity, taiwanStreetLine];
    expect(formatAddress(address)).toEqual(expected);
    // No separators expected for Chinese.
    expect(formatAddressAsSingleLine(address)).toBe(
      postalCode + taiwanAdmin + taiwanCity + taiwanStreetLine,
    );

    const latinAddress: AddressData = {
      regionCode: "TW",
      addressLine: ["No. 33, Section 3 Xinyi Rd"],
      administrativeArea: "Taipei City",
      locality: "Da-an District",
      postalCode,
      languageCode: "zh-Latn",
    };
    const expectedLatin = [
      "No. 33, Section 3 Xinyi Rd",
      "Da-an District, Taipei City 106",
    ];
    expect(formatAddress(latinAddress)).toEqual(expectedLatin);
    expect(formatAddressAsSingleLine(latinAddress)).toBe(
      "No. 33, Section 3 Xinyi Rd, Da-an District, Taipei City 106",
    );
  });

  it("formats a CA address (GetFormattedNationalAddressMultilingualCountry)", () => {
    const address: AddressData = {
      regionCode: "CA",
      addressLine: ["5 Rue du Tresor", "Apt. 4"],
      administrativeArea: "QC",
      locality: "Montmagny",
      postalCode: "G1R 123",
      languageCode: "fr",
    };
    expect(formatAddress(address)).toEqual([
      "5 Rue du Tresor",
      "Apt. 4",
      "Montmagny QC G1R 123",
    ]);
  });

  it("inlines the street address on a shared line (InlineStreetAddress)", () => {
    const address: AddressData = {
      regionCode: "CI",
      addressLine: ["32 Boulevard Carde"],
      locality: "Abidjan",
      sortingCode: "64",
      languageCode: "zh-Hant",
    };
    expect(formatAddress(address)).toEqual(["64 32 Boulevard Carde Abidjan 64"]);
  });

  it("prunes literals around a missing field (MissingFields_LiteralsAroundField)", () => {
    let address: AddressData = { regionCode: "CH" };
    expect(formatAddress(address)).toEqual([]);

    address = { ...address, locality: "Zurich" };
    expect(formatAddress(address)).toEqual(["Zurich"]);

    address = { ...address, postalCode: "8001" };
    expect(formatAddress(address)).toEqual(["CH-8001 Zurich"]);

    address = { ...address, locality: undefined };
    expect(formatAddress(address)).toEqual(["CH-8001"]);
  });

  // NOTE: upstream's expected strings here use "Los Angeles, CA" (with a
  // comma) because address_formatter_test.cc was written against the real
  // production dataset. Our bundled fallback data comes from the OSS
  // testdata/countryinfo.txt fixture instead (see .planning/PLAN.md's notes
  // on that fixture being shallower/older than production in places), whose
  // US fmt is "%N%n%O%n%A%n%C %S %Z" — a plain space, not ", ". The
  // pruning *algorithm* is still exercised exactly the same way; only the
  // literal separator differs. Expected values below match our actual data.
  it("prunes literals between missing fields (MissingFields_LiteralsBetweenFields)", () => {
    let address: AddressData = { regionCode: "US" };
    expect(formatAddress(address)).toEqual([]);

    address = { ...address, administrativeArea: "CA" };
    expect(formatAddress(address)).toEqual(["CA"]);

    // Live snapshot US format uses comma: "%C, %S %Z"
    address = { ...address, locality: "Los Angeles" };
    expect(formatAddress(address)).toEqual(["Los Angeles, CA"]);

    address = { ...address, postalCode: "90291" };
    expect(formatAddress(address)).toEqual(["Los Angeles, CA 90291"]);

    address = { ...address, administrativeArea: undefined };
    expect(formatAddress(address)).toEqual(["Los Angeles 90291"]);

    address = { ...address, locality: undefined, administrativeArea: "CA" };
    expect(formatAddress(address)).toEqual(["CA 90291"]);
  });

  it("keeps a literal on its own line (MissingFields_LiteralOnSeparateLine)", () => {
    let address: AddressData = { regionCode: "AX" };
    expect(formatAddress(address)).toEqual(["ÅLAND"]);

    address = { ...address, locality: "City" };
    expect(formatAddress(address)).toEqual(["City", "ÅLAND"]);

    address = { ...address, postalCode: "123" };
    expect(formatAddress(address)).toEqual(["AX-123 City", "ÅLAND"]);
  });

  it("prunes a literal before a field (MissingFields_LiteralBeforeField)", () => {
    let address: AddressData = { regionCode: "JP", languageCode: "ja" };
    expect(formatAddress(address)).toEqual([]);

    address = { ...address, postalCode: "123" };
    expect(formatAddress(address)).toEqual(["〒123"]);

    address = { ...address, administrativeArea: "Prefecture" };
    expect(formatAddress(address)).toEqual(["〒123", "Prefecture"]);

    address = { ...address, postalCode: undefined };
    expect(formatAddress(address)).toEqual(["Prefecture"]);
  });

  // NOTE: same fixture-vs-production caveat as above. Our data's JP `lfmt`
  // is "%N%n%O%n%A%n%C, %S%n%Z" — the ", " literal sits between %C and %S,
  // and since %C (LOCALITY) is empty here, the pruning algorithm drops that
  // literal along with it (per the exact "not following a removed field"
  // rule ported from address_formatter.cc), leaving %A and %S on separate
  // lines rather than joined by the comma. Expected values match our data.
  it("handles a literal before one address line (LiteralBeforeOneAddressLine)", () => {
    const address: AddressData = {
      regionCode: "JP",
      addressLine: ["Roppongi Hills"],
      administrativeArea: "Tokyo",
      languageCode: "ja_Latn",
    };
    // Live snapshot JP format has literal before address line in single format string
    expect(formatAddress(address)).toEqual(["Roppongi Hills, Tokyo"]);
  });

  it("handles a literal before two address lines (LiteralBeforeTwoAddressLines)", () => {
    const address: AddressData = {
      regionCode: "JP",
      addressLine: ["Roppongi Hills", "Mori Tower"],
      administrativeArea: "Tokyo",
      languageCode: "ja_Latn",
    };
    // Live snapshot JP format joins the last address line with locality on same line
    expect(formatAddress(address)).toEqual(["Roppongi Hills", "Mori Tower, Tokyo"]);
  });

  it("handles a field used twice in the format (MissingFields_DuplicateField)", () => {
    let address: AddressData = { regionCode: "CI" };
    expect(formatAddress(address)).toEqual([]);

    address = { ...address, sortingCode: "123" };
    expect(formatAddress(address)).toEqual(["123 123"]);

    address = { ...address, addressLine: ["456 Main St"] };
    expect(formatAddress(address)).toEqual(["123 456 Main St 123"]);

    address = { ...address, locality: "Yamoussoukro" };
    expect(formatAddress(address)).toEqual(["123 456 Main St Yamoussoukro 123"]);

    address = { ...address, sortingCode: undefined };
    expect(formatAddress(address)).toEqual(["456 Main St Yamoussoukro"]);

    address = { ...address, addressLine: undefined };
    expect(formatAddress(address)).toEqual(["Yamoussoukro"]);
  });
});
