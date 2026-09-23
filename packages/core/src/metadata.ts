// Port of cpp/src/address_metadata.cc (Apache-2.0, Google Inc.).

import type { AddressField } from "./address-field.js";
import { formatElementsEqual, fieldElement } from "./internal/format-element.js";
import * as RegionDataConstants from "./internal/region-data-constants.js";
import { parseRule } from "./internal/rule.js";

function getRule(regionCode: string) {
  return parseRule(
    RegionDataConstants.getRegionData(regionCode),
    RegionDataConstants.getDefaultRule(),
  );
}

export function isFieldRequired(field: AddressField, regionCode: string): boolean {
  if (field === "COUNTRY") {
    return true;
  }
  const rule = getRule(regionCode);
  if (rule === undefined) {
    return false;
  }
  return rule.required.includes(field);
}

export function isFieldUsed(field: AddressField, regionCode: string): boolean {
  if (field === "COUNTRY") {
    return true;
  }
  const rule = getRule(regionCode);
  if (rule === undefined) {
    return false;
  }
  const target = fieldElement(field);
  return rule.format.some((element) => formatElementsEqual(element, target));
}
