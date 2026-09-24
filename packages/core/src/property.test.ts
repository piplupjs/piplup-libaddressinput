// Property tests (PLAN.md §6 Phase 8): invariants that should hold for
// *any* input, not just the specific cases ported from upstream's test
// suite elsewhere in this package. Uses fast-check.

import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import { FallbackAggregateSource } from "../test/fake-sources.js";
import type { AddressData } from "./address-data.js";
import { formatAddress, getStreetAddressLinesAsSingleLine } from "./formatter.js";
import { buildLayout, getRegionCodes } from "./layout.js";
import { normalize } from "./normalizer.js";
import { NullStorage } from "./storage.js";
import { PreloadSupplier } from "./supplier/preload.js";
import { validate } from "./validator.js";

// A handful of structurally different regions (deep hierarchy, shallow,
// Latin+native scripts, RTL-adjacent) rather than all 252 — enough to
// exercise real code paths without making every property run slow.
const SAMPLE_REGIONS = ["US", "CH", "JP", "CN", "GB", "AE", "ZW"] as const;

// Also cover the "no data for this region" paths (empty regionCode, and an
// unsupported/made-up code) — every function under test must degrade
// gracefully rather than throw. This is exactly the gap that let a real bug
// through once already: formatAddress() crashed on regionCode: "" because it
// force-unwrapped an internal parseRule() result that upstream's own
// GetFormattedNationalAddress never actually guarantees is defined (it
// silently ignores ParseSerializedRule's failure and keeps using the
// default-only rule instead) — see formatter.ts's fix and its comment.
const NO_DATA_REGIONS = ["", "QZ", "rrr"] as const;

const shortString = fc.string({ maxLength: 12 });
const optionalShortString = fc.option(shortString, { nil: undefined });

function addressArbitrary(regionCode: string): fc.Arbitrary<AddressData> {
  return fc.record(
    {
      regionCode: fc.constant(regionCode),
      addressLine: fc.option(fc.array(shortString, { maxLength: 3 }), { nil: undefined }),
      administrativeArea: optionalShortString,
      locality: optionalShortString,
      dependentLocality: optionalShortString,
      postalCode: optionalShortString,
      sortingCode: optionalShortString,
      languageCode: fc.option(fc.constantFrom("en", "fr", "ja", "zh", "de", ""), {
        nil: undefined,
      }),
      organization: optionalShortString,
      recipient: optionalShortString,
    },
    { requiredKeys: ["regionCode"] },
  );
}

const anyRegionAddress = fc
  .constantFrom(...SAMPLE_REGIONS)
  .chain((regionCode) => addressArbitrary(regionCode));

// A variant with non-blank addressLine entries only, for the "no blank
// output line" invariant below. A *mix* of blank and non-blank lines (e.g.
// `["", "Foo"]`) is deliberately excluded: upstream's own STREET_ADDRESS
// handling in address_formatter.cc checks `IsFieldEmpty` (true only if
// *every* line is blank) before copying `address_line.front()`/back() as-is
// into the output — so a blank *interior* line survives, and if `front()`
// itself happens to be blank while a later line isn't, that blank string
// becomes a real entry in the output array. That's a faithfully-ported
// upstream quirk, not a bug in this port, so it's not a universal invariant
// to test for; excluding blank lines from the input sidesteps it here.
function nonBlankAddressArbitrary(regionCode: string): fc.Arbitrary<AddressData> {
  return addressArbitrary(regionCode).map((address) => ({
    ...address,
    addressLine: address.addressLine?.filter((line) => line.trim().length > 0),
  }));
}

const anyRegionAddressNoBlankLines = fc
  .constantFrom(...SAMPLE_REGIONS)
  .chain((regionCode) => nonBlankAddressArbitrary(regionCode));

const anyAddressIncludingNoData = fc
  .constantFrom(...SAMPLE_REGIONS, ...NO_DATA_REGIONS)
  .chain((regionCode) => addressArbitrary(regionCode));

describe("formatAddress: never throws, even with no data for the region", () => {
  it("holds for regions with no rule at all (empty/unsupported region code)", () => {
    fc.assert(
      fc.property(anyAddressIncludingNoData, (address) => {
        expect(() => formatAddress(address)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });
});

describe("formatAddress: never throws, never emits a blank line", () => {
  it("holds for arbitrary field values across several regions", () => {
    fc.assert(
      fc.property(anyRegionAddressNoBlankLines, (address) => {
        const lines = formatAddress(address);
        expect(lines.every((line) => line.length > 0)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });

  it("getStreetAddressLinesAsSingleLine never throws", () => {
    fc.assert(
      fc.property(anyRegionAddress, (address) => {
        expect(() => getStreetAddressLinesAsSingleLine(address)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });
});

describe("buildLayout: never throws, for a real region or one with no data", () => {
  it("holds across every supported region and a few UI languages", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...getRegionCodes(), ...NO_DATA_REGIONS),
        fc.constantFrom("en", "fr", "ja", "zh-Hans", ""),
        (regionCode, uiLanguageTag) => {
          expect(() => buildLayout(regionCode, uiLanguageTag)).not.toThrow();
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("JSON-serializability: every public output survives a round-trip unchanged", () => {
  it("AddressLayout", () => {
    fc.assert(
      fc.property(fc.constantFrom(...SAMPLE_REGIONS), (regionCode) => {
        const layout = buildLayout(regionCode, "en");
        expect(JSON.parse(JSON.stringify(layout))).toEqual(layout);
      }),
    );
  });

  it("ValidationProblem[]", async () => {
    const supplier = new PreloadSupplier(
      new FallbackAggregateSource(),
      new NullStorage(),
    );
    await Promise.all(SAMPLE_REGIONS.map((r) => supplier.loadRules(r)));

    await fc.assert(
      fc.asyncProperty(anyRegionAddress, async (address) => {
        const problems = await validate(supplier, address);
        expect(JSON.parse(JSON.stringify(problems))).toEqual(problems);
      }),
      { numRuns: 100 },
    );
  });
});

describe("validate: deterministic for a fixed address and loaded supplier", () => {
  let supplier: PreloadSupplier;

  beforeAll(async () => {
    supplier = new PreloadSupplier(new FallbackAggregateSource(), new NullStorage());
    await Promise.all(SAMPLE_REGIONS.map((r) => supplier.loadRules(r)));
  });

  it("two calls with the same address produce the same problems", async () => {
    await fc.assert(
      fc.asyncProperty(anyRegionAddress, async (address) => {
        const [first, second] = await Promise.all([
          validate(supplier, address),
          validate(supplier, address),
        ]);
        expect(second).toEqual(first);
      }),
      { numRuns: 150 },
    );
  });
});

describe("normalize: never throws for a loaded region, and is idempotent", () => {
  let supplier: PreloadSupplier;

  beforeAll(async () => {
    supplier = new PreloadSupplier(new FallbackAggregateSource(), new NullStorage());
    await Promise.all(SAMPLE_REGIONS.map((r) => supplier.loadRules(r)));
  });

  it("holds for arbitrary field values", () => {
    fc.assert(
      fc.property(anyRegionAddress, (address) => {
        const once = normalize(supplier, address);
        expect(() => normalize(supplier, once)).not.toThrow();
        const twice = normalize(supplier, once);
        // Normalizing an already-normalized address changes nothing further.
        expect(twice).toEqual(once);
      }),
      { numRuns: 200 },
    );
  });
});
