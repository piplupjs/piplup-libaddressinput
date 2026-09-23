// Ported from cpp/test/lookup_key_test.cc (Apache-2.0, Google Inc.).
//
// The upstream tests use `AddressData{.region_code = "111", ...}` — plain
// non-real codes — for the structural tests, and real regions (CA, AF) for
// the language-suffix tests, since that decision needs metadata. Both are
// available here via the bundled fallback dataset (data/fallback.ts).

import { describe, expect, it } from "vitest";
import type { AddressData } from "../address-data.js";
import {
  LOOKUP_KEY_HIERARCHY,
  lookupKeyDepth,
  lookupKeyFromAddress,
  lookupKeyRegionCode,
  lookupKeyToString,
} from "./lookup-key.js";

const MAX_DEPTH = LOOKUP_KEY_HIERARCHY.length - 1;

describe("lookupKeyFromAddress", () => {
  it("defaults to ZZ for an empty address (Empty)", () => {
    const key = lookupKeyFromAddress({ regionCode: "" });
    expect(lookupKeyToString(key, MAX_DEPTH)).toBe("data/ZZ");
  });

  it("depth 1 (AddressDepth1)", () => {
    const key = lookupKeyFromAddress({ regionCode: "111" });
    expect(lookupKeyDepth(key)).toBe(0);
    expect(lookupKeyToString(key, MAX_DEPTH)).toBe("data/111");
  });

  it("depth 2 (AddressDepth2)", () => {
    const key = lookupKeyFromAddress({
      regionCode: "111",
      administrativeArea: "222",
    });
    expect(lookupKeyDepth(key)).toBe(1);
    expect(lookupKeyToString(key, MAX_DEPTH)).toBe("data/111/222");
  });

  it("depth 3 (AddressDepth3)", () => {
    const key = lookupKeyFromAddress({
      regionCode: "111",
      administrativeArea: "222",
      locality: "333",
    });
    expect(lookupKeyDepth(key)).toBe(2);
    expect(lookupKeyToString(key, MAX_DEPTH)).toBe("data/111/222/333");
  });

  it("depth 4 (AddressDepth4)", () => {
    const key = lookupKeyFromAddress({
      regionCode: "111",
      administrativeArea: "222",
      locality: "333",
      dependentLocality: "444",
    });
    expect(lookupKeyDepth(key)).toBe(3);
    expect(lookupKeyToString(key, MAX_DEPTH)).toBe("data/111/222/333/444");
  });

  it("stops at the first gap (AddressDepthNonContiguous)", () => {
    const key = lookupKeyFromAddress({
      regionCode: "111",
      administrativeArea: "222",
      // No locality specified.
      dependentLocality: "444",
    });
    expect(lookupKeyDepth(key)).toBe(1);
    expect(lookupKeyToString(key, MAX_DEPTH)).toBe("data/111/222");
  });

  it("terminates on a slash in a field value (AddressDepthTerminateOnSlash)", () => {
    const key = lookupKeyFromAddress({
      regionCode: "111",
      administrativeArea: "222",
      locality: "3/3", // No data should be requested for this locality.
      dependentLocality: "444",
    });
    expect(lookupKeyDepth(key)).toBe(1);
    expect(lookupKeyToString(key, MAX_DEPTH)).toBe("data/111/222");
  });

  it("supports requesting shallower depths (RequestDepth)", () => {
    const key = lookupKeyFromAddress({
      regionCode: "111",
      administrativeArea: "222",
      locality: "333",
      dependentLocality: "444",
    });
    expect(lookupKeyToString(key, 0)).toBe("data/111");
    expect(lookupKeyToString(key, 1)).toBe("data/111/222");
    expect(lookupKeyToString(key, 2)).toBe("data/111/222/333");
    expect(lookupKeyToString(key, 3)).toBe("data/111/222/333/444");
  });

  it("omits the language suffix for the default language (WithLanguageCodeDefaultLanguage)", () => {
    const address: AddressData = {
      regionCode: "CA",
      administrativeArea: "ON",
      languageCode: "en",
    };
    const key = lookupKeyFromAddress(address);
    expect(lookupKeyToString(key, 0)).toBe("data/CA");
    expect(lookupKeyToString(key, 1)).toBe("data/CA/ON");
  });

  it("adds the language suffix for an alternate language (WithLanguageCodeAlternateLanguage)", () => {
    const address: AddressData = {
      regionCode: "CA",
      administrativeArea: "ON",
      languageCode: "fr",
    };
    const key = lookupKeyFromAddress(address);
    expect(lookupKeyToString(key, 0)).toBe("data/CA--fr");
    expect(lookupKeyToString(key, 1)).toBe("data/CA/ON--fr");
  });

  it("omits the suffix for a language the region doesn't support (WithLanguageCodeInvalidLanguage)", () => {
    const address: AddressData = {
      regionCode: "CA",
      administrativeArea: "ON",
      languageCode: "de",
    };
    const key = lookupKeyFromAddress(address);
    expect(lookupKeyToString(key, 0)).toBe("data/CA");
    expect(lookupKeyToString(key, 1)).toBe("data/CA/ON");
  });

  it("omits the suffix for a region with no subregions (WithLanguageCodeAlternateLanguageNoState)", () => {
    // Afghanistan has no subregion data, so no language suffix is added
    // regardless of language.
    const address: AddressData = { regionCode: "AF", languageCode: "ps" };
    const key = lookupKeyFromAddress(address);
    expect(lookupKeyToString(key, 0)).toBe("data/AF");
  });

  it("returns the region code (GetRegionCode)", () => {
    const key = lookupKeyFromAddress({ regionCode: "rrr" });
    expect(lookupKeyRegionCode(key)).toBe("rrr");
  });

  it("each call is independent (FromAddressClearsExistingNodes)", () => {
    const withState = lookupKeyFromAddress({
      regionCode: "111",
      administrativeArea: "222",
    });
    expect(lookupKeyToString(withState, MAX_DEPTH)).toBe("data/111/222");

    const withoutState = lookupKeyFromAddress({ regionCode: "111" });
    expect(lookupKeyToString(withoutState, MAX_DEPTH)).toBe("data/111");
  });
});
