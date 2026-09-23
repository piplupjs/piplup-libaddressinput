// Ported from cpp/test/address_metadata_test.cc (Apache-2.0, Google Inc.).

import { describe, expect, it } from "vitest";
import { isFieldRequired, isFieldUsed } from "./metadata.js";

describe("isFieldRequired", () => {
  it("COUNTRY is always required, even for unsupported regions (IsFieldRequiredCountry)", () => {
    expect(isFieldRequired("COUNTRY", "US")).toBe(true);
    expect(isFieldRequired("COUNTRY", "CH")).toBe(true);
    expect(isFieldRequired("COUNTRY", "rrr")).toBe(true);
  });

  it("ADMIN_AREA is required for US (IsFieldRequiredAdminAreaUS)", () => {
    expect(isFieldRequired("ADMIN_AREA", "US")).toBe(true);
  });

  it("ADMIN_AREA is not required for AT (IsFieldRequiredAdminAreaAT)", () => {
    expect(isFieldRequired("ADMIN_AREA", "AT")).toBe(false);
  });

  it("is false for an unsupported region (IsFieldRequiredAdminAreaSU)", () => {
    expect(isFieldRequired("ADMIN_AREA", "SU")).toBe(false);
  });
});

describe("isFieldUsed", () => {
  it("COUNTRY is always used, even for unsupported regions (IsUsedRequiredCountry)", () => {
    expect(isFieldUsed("COUNTRY", "US")).toBe(true);
    expect(isFieldUsed("COUNTRY", "CH")).toBe(true);
    expect(isFieldUsed("COUNTRY", "rrr")).toBe(true);
  });

  it("DEPENDENT_LOCALITY is not used for US (IsFieldUsedDependentLocalityUS)", () => {
    expect(isFieldUsed("DEPENDENT_LOCALITY", "US")).toBe(false);
  });

  it("DEPENDENT_LOCALITY is used for CN (IsFieldUsedDependentLocalityCN)", () => {
    expect(isFieldUsed("DEPENDENT_LOCALITY", "CN")).toBe(true);
  });

  it("is false for an unsupported region (IsFieldUsedDependentLocalitySU)", () => {
    expect(isFieldUsed("DEPENDENT_LOCALITY", "SU")).toBe(false);
  });
});
