// Port of cpp/include/libaddressinput/address_ui.h + address_ui_component.h
// (Apache-2.0, Google Inc.), reshaped as a headless, data-only layout
// descriptor. See .planning/PLAN.md §5 for the full shape and §6 Phase 6
// for the implementation plan.
//
// STATUS: Phase 6 stub. Not yet implemented.

import type { AddressField } from "./address-field.js";

export type MessageId = string;

export interface RegionOption {
  key: string;
  name: string;
  latinName?: string;
  hasChildren: boolean;
}

export interface LayoutField {
  field: AddressField;
  labelId: MessageId;
  required: boolean;
  length: "short" | "long";
  uppercase: boolean;
  options?: RegionOption[];
  multiline?: boolean;
}

export interface AddressLayout {
  regionCode: string;
  languageTag: string;
  script: "native" | "latin";
  rows: LayoutField[][];
  postalCodeExample?: string;
  postalCodeUrl?: string;
}

export interface BuildLayoutOptions {
  supplier?: unknown;
  uiLanguage?: string;
  latin?: boolean;
}

/** Builds a data-only form layout descriptor for a region. Not yet implemented. */
export function buildLayout(
  _regionCode: string,
  _options?: BuildLayoutOptions,
): AddressLayout {
  throw new Error("buildLayout: not implemented yet (see .planning/PLAN.md Phase 6)");
}
