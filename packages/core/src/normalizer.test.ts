// Ported from cpp/test/address_normalizer_test.cc (Apache-2.0, Google Inc.).

import { beforeEach, describe, expect, it } from "vitest";
import { FixtureDataSource } from "../test/fake-sources.js";
import type { AddressData } from "./address-data.js";
import { normalize } from "./normalizer.js";
import { NullStorage } from "./storage.js";
import { PreloadSupplier } from "./supplier/preload.js";

describe("normalize (AddressNormalizerTest)", () => {
  let supplier: PreloadSupplier;

  beforeEach(() => {
    supplier = new PreloadSupplier(new FixtureDataSource(), new NullStorage());
  });

  async function load(regionCode: string): Promise<void> {
    const result = await supplier.loadRules(regionCode);
    expect(result.success).toBe(true);
    expect(result.ruleCount).toBeGreaterThan(0);
  }

  it("doesn't crash with no language and no admin area data (CountryWithNoLanguageNoAdminArea)", async () => {
    await load("IR");
    const address: AddressData = { regionCode: "IR", administrativeArea: "Tehran" };
    expect(normalize(supplier, address).administrativeArea).toBe("Tehran");
  });

  it("normalizes admin area and leaves locality alone for BR (BrazilAdminAreaAndLocality)", async () => {
    await load("BR");
    const address: AddressData = {
      regionCode: "BR",
      administrativeArea: "Maranhão",
      locality: "Cantanhede",
    };
    const result = normalize(supplier, address);
    expect(result.administrativeArea).toBe("MA");
    expect(result.locality).toBe("Cantanhede");
  });

  it("searches every language regardless of the address's own tag (FrenchCanadaNameLanguageNotConsistent)", async () => {
    await load("CA");
    const address: AddressData = {
      regionCode: "CA",
      administrativeArea: "Nouveau-Brunswick",
      languageCode: "en-CA",
    };
    expect(normalize(supplier, address).administrativeArea).toBe("NB");
  });

  it("normalizes a French Canadian name (FrenchCanadaName)", async () => {
    await load("CA");
    const address: AddressData = {
      regionCode: "CA",
      administrativeArea: "Nouveau-Brunswick",
      languageCode: "fr-CA",
    };
    expect(normalize(supplier, address).administrativeArea).toBe("NB");
  });

  it("matches even when the address's language isn't one of the region's (FrenchCanadaNameLanguageNotListed)", async () => {
    await load("CA");
    const address: AddressData = {
      regionCode: "CA",
      administrativeArea: "Colombie-Britannique",
      languageCode: "fa-CA",
    };
    expect(normalize(supplier, address).administrativeArea).toBe("BC");
  });

  it("normalizes 'California' to 'CA' (CaliforniaShortNameCa)", async () => {
    await load("US");
    const address: AddressData = {
      regionCode: "US",
      administrativeArea: "California",
      locality: "Mountain View",
      languageCode: "en-US",
    };
    expect(normalize(supplier, address).administrativeArea).toBe("CA");
  });

  it("doesn't crash on non-standard data with no key--language variant (CountryWithNonStandardData)", async () => {
    await load("HK");
    const address: AddressData = { regionCode: "HK", administrativeArea: "香港島" };
    expect(normalize(supplier, address).administrativeArea).toBe("香港島");
  });

  it("leaves a Latin name unchanged when tagged ko-Latn (GangwonLatinNameStaysUnchanged)", async () => {
    await load("KR");
    const address: AddressData = {
      regionCode: "KR",
      administrativeArea: "Gangwon",
      languageCode: "ko-Latn",
    };
    expect(normalize(supplier, address).administrativeArea).toBe("Gangwon");
  });

  it("normalizes a Korean name to its canonical sub-key (GangwonKoreanName)", async () => {
    await load("KR");
    const address: AddressData = {
      regionCode: "KR",
      administrativeArea: "강원",
      languageCode: "ko-KR",
    };
    expect(normalize(supplier, address).administrativeArea).toBe("강원도");
  });

  it("doesn't switch to Latin script for an untagged address (DontSwitchLatinScriptForUnknownLanguage)", async () => {
    await load("KR");
    const address: AddressData = { regionCode: "KR", administrativeArea: "Gangwon" };
    expect(normalize(supplier, address).administrativeArea).toBe("Gangwon");
  });

  it("doesn't switch to local script for an untagged address (DontSwitchLocalScriptForUnknownLanguage)", async () => {
    await load("KR");
    const address: AddressData = { regionCode: "KR", administrativeArea: "강원" };
    expect(normalize(supplier, address).administrativeArea).toBe("강원도");
  });

  it("does not mutate the input address", async () => {
    await load("US");
    const address: AddressData = {
      regionCode: "US",
      administrativeArea: "California",
      languageCode: "en-US",
    };
    const result = normalize(supplier, address);
    expect(address.administrativeArea).toBe("California");
    expect(result).not.toBe(address);
  });
});
