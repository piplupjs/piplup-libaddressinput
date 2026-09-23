// Port of cpp/src/rule.h / rule.cc (Apache-2.0, Google Inc.).
//
// Parses one address-metadata JSON object (the `data/<CC>` or
// `data/<CC>/<sub>` values from the aggregate dataset — see
// .planning/PLAN.md Phase 1/2) into a plain, immutable Rule.
//
// Scope note: upstream's `Rule` class only reads the JSON keys handled
// below (verified against cpp/src/rule.cc and cpp/src/address_ui.cc /
// region_data_builder.cc in the vendored submodule). Keys like `upper`,
// `sub_names`, `sub_lnames`, `sub_isoids`, `key`, `width_overrides` and
// `sub_mores` are NOT read anywhere in the current C++ engine — sub-region
// names/Latin names come from each sub-key's own rule (its `name`/`lname`),
// not from arrays on the parent. An earlier draft of PLAN.md listed those
// extra keys; that was wrong and has been corrected.

import type { AddressField } from "../address-field.js";
import {
  parseAddressFieldsRequired,
  parseFormatRule,
} from "./address-field-util.js";
import type { FormatElement } from "./format-element.js";

const SEPARATOR = "~";

// Mirrors the upstream message ID constants (see cpp/res/messages.grdp) that
// Rule can select via state_name_type / zip_name_type / locality_name_type /
// sublocality_name_type. Represented as string literals rather than the
// grit-generated numeric IDs, since the numbers have no meaning outside the
// C++ build; `undefined` stands in for INVALID_MESSAGE_ID.
export type NameTypeMessageId =
  | "IDS_LIBADDRESSINPUT_AREA"
  | "IDS_LIBADDRESSINPUT_COUNTY"
  | "IDS_LIBADDRESSINPUT_DEPARTMENT"
  | "IDS_LIBADDRESSINPUT_DISTRICT"
  | "IDS_LIBADDRESSINPUT_DO_SI"
  | "IDS_LIBADDRESSINPUT_EMIRATE"
  | "IDS_LIBADDRESSINPUT_ISLAND"
  | "IDS_LIBADDRESSINPUT_OBLAST"
  | "IDS_LIBADDRESSINPUT_PARISH"
  | "IDS_LIBADDRESSINPUT_PREFECTURE"
  | "IDS_LIBADDRESSINPUT_PROVINCE"
  | "IDS_LIBADDRESSINPUT_STATE"
  | "IDS_LIBADDRESSINPUT_EIR_CODE_LABEL"
  | "IDS_LIBADDRESSINPUT_PIN_CODE_LABEL"
  | "IDS_LIBADDRESSINPUT_POSTAL_CODE_LABEL"
  | "IDS_LIBADDRESSINPUT_ZIP_CODE_LABEL"
  | "IDS_LIBADDRESSINPUT_LOCALITY_LABEL"
  | "IDS_LIBADDRESSINPUT_POST_TOWN"
  | "IDS_LIBADDRESSINPUT_SUBURB"
  | "IDS_LIBADDRESSINPUT_NEIGHBORHOOD"
  | "IDS_LIBADDRESSINPUT_TOWNLAND"
  | "IDS_LIBADDRESSINPUT_VILLAGE_TOWNSHIP";

// Mirrors kAdminAreaMessageIds / kPostalCodeMessageIds / kLocalityMessageIds /
// kSublocalityMessageIds in rule.cc exactly.
const ADMIN_AREA_NAME_IDS: Record<string, NameTypeMessageId> = {
  area: "IDS_LIBADDRESSINPUT_AREA",
  county: "IDS_LIBADDRESSINPUT_COUNTY",
  department: "IDS_LIBADDRESSINPUT_DEPARTMENT",
  district: "IDS_LIBADDRESSINPUT_DISTRICT",
  do_si: "IDS_LIBADDRESSINPUT_DO_SI",
  emirate: "IDS_LIBADDRESSINPUT_EMIRATE",
  island: "IDS_LIBADDRESSINPUT_ISLAND",
  oblast: "IDS_LIBADDRESSINPUT_OBLAST",
  parish: "IDS_LIBADDRESSINPUT_PARISH",
  prefecture: "IDS_LIBADDRESSINPUT_PREFECTURE",
  province: "IDS_LIBADDRESSINPUT_PROVINCE",
  state: "IDS_LIBADDRESSINPUT_STATE",
};

const POSTAL_CODE_NAME_IDS: Record<string, NameTypeMessageId> = {
  eircode: "IDS_LIBADDRESSINPUT_EIR_CODE_LABEL",
  pin: "IDS_LIBADDRESSINPUT_PIN_CODE_LABEL",
  postal: "IDS_LIBADDRESSINPUT_POSTAL_CODE_LABEL",
  zip: "IDS_LIBADDRESSINPUT_ZIP_CODE_LABEL",
};

const LOCALITY_NAME_IDS: Record<string, NameTypeMessageId> = {
  city: "IDS_LIBADDRESSINPUT_LOCALITY_LABEL",
  district: "IDS_LIBADDRESSINPUT_DISTRICT",
  post_town: "IDS_LIBADDRESSINPUT_POST_TOWN",
  suburb: "IDS_LIBADDRESSINPUT_SUBURB",
};

const SUBLOCALITY_NAME_IDS: Record<string, NameTypeMessageId> = {
  district: "IDS_LIBADDRESSINPUT_DISTRICT",
  neighborhood: "IDS_LIBADDRESSINPUT_NEIGHBORHOOD",
  suburb: "IDS_LIBADDRESSINPUT_SUBURB",
  townland: "IDS_LIBADDRESSINPUT_TOWNLAND",
  village_township: "IDS_LIBADDRESSINPUT_VILLAGE_TOWNSHIP",
};

export interface Rule {
  id: string;
  format: FormatElement[];
  latinFormat: FormatElement[];
  required: AddressField[];
  subKeys: string[];
  languages: string[];
  /** Compiled from `zip`, anchored at the start like upstream's RE2 matcher. */
  postalCodeMatcher: RegExp | undefined;
  /** Set only when `zip` is a literal value rather than a pattern. */
  solePostalCode: string;
  adminAreaNameMessageId: NameTypeMessageId | undefined;
  postalCodeNameMessageId: NameTypeMessageId | undefined;
  localityNameMessageId: NameTypeMessageId | undefined;
  sublocalityNameMessageId: NameTypeMessageId | undefined;
  name: string;
  latinName: string;
  postalCodeExample: string;
  postServiceUrl: string;
}

export function createEmptyRule(): Rule {
  return {
    id: "",
    format: [],
    latinFormat: [],
    required: [],
    subKeys: [],
    languages: [],
    postalCodeMatcher: undefined,
    solePostalCode: "",
    adminAreaNameMessageId: undefined,
    postalCodeNameMessageId: undefined,
    localityNameMessageId: undefined,
    sublocalityNameMessageId: undefined,
    name: "",
    latinName: "",
    postalCodeExample: "",
    postServiceUrl: "",
  };
}

function splitList(value: string): string[] {
  return value.length === 0 ? [] : value.split(SEPARATOR);
}

// Mirrors ContainsRegExSpecialCharacters in rule.cc: a string is treated as a
// literal postal code (rather than a pattern) unless it contains one of the
// regex metacharacters that actually appear in this dataset's zip patterns.
const REGEX_SPECIAL_CHARACTERS = /[([\\{?]/;

function containsRegExSpecialCharacters(input: string): boolean {
  return REGEX_SPECIAL_CHARACTERS.test(input);
}

function compilePostalCodeMatcher(zip: string): RegExp | undefined {
  try {
    // Anchored at the start only, mirroring RE2::PartialMatch usage for
    // prefix matching; callers needing a full match append `$` themselves.
    // No "u" flag: RE2 patterns in this dataset aren't written against JS's
    // stricter Unicode-mode grammar, and a pattern RE2 accepts should not be
    // rejected here just because JS's "u" mode is pickier about escapes.
    return new RegExp(`^(${zip})`);
  } catch {
    return undefined;
  }
}

/**
 * Parses one address-metadata JSON value (already `JSON.parse`d, or a JSON
 * string) into a Rule. Returns `undefined` if `serializedRule` is not valid
 * JSON — this is the one case upstream's `ParseSerializedRule` reports
 * failure for; an empty object `{}` parses successfully into an empty rule,
 * matching `EmptyDictionaryIsValid`.
 */
export function parseRule(
  serializedRule: string | unknown,
  base?: Rule,
): Rule | undefined {
  let json: unknown;
  if (typeof serializedRule === "string") {
    try {
      json = JSON.parse(serializedRule);
    } catch {
      return undefined;
    }
  } else {
    json = serializedRule;
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return undefined;
  }
  return parseJsonRule(json as Record<string, unknown>, base);
}

/**
 * Parses an already-decoded rule object. Mirrors `Rule::ParseJsonRule`.
 *
 * Pass `base` to merge onto an existing rule instead of a blank one — only
 * the fields present in `json` are overwritten, the rest are inherited from
 * `base`. This is how upstream builds a country-level rule (`rule.CopyFrom
 * (Rule::GetDefault()); rule.ParseJsonRule(json)` in preload_supplier.cc) —
 * see `mergeDefaultRule` below and getDefaultRule() in region-data-constants
 * usage sites.
 */
export function parseJsonRule(
  json: Record<string, unknown>,
  base: Rule = createEmptyRule(),
): Rule {
  const rule = { ...base };

  const str = (key: string): string | undefined => {
    const value = json[key];
    return typeof value === "string" ? value : undefined;
  };

  const id = str("id");
  if (id !== undefined) rule.id = id;

  const fmt = str("fmt");
  if (fmt !== undefined) rule.format = parseFormatRule(fmt);

  const lfmt = str("lfmt");
  if (lfmt !== undefined) rule.latinFormat = parseFormatRule(lfmt);

  const require = str("require");
  if (require !== undefined) rule.required = parseAddressFieldsRequired(require);

  const subKeys = str("sub_keys");
  if (subKeys !== undefined) rule.subKeys = splitList(subKeys);

  const languages = str("languages");
  if (languages !== undefined) rule.languages = splitList(languages);

  const zip = str("zip");
  if (zip !== undefined) {
    rule.postalCodeMatcher = compilePostalCodeMatcher(zip);
    rule.solePostalCode = containsRegExSpecialCharacters(zip) ? "" : zip;
  }

  const stateNameType = str("state_name_type");
  if (stateNameType !== undefined) {
    rule.adminAreaNameMessageId = ADMIN_AREA_NAME_IDS[stateNameType];
  }

  const zipNameType = str("zip_name_type");
  if (zipNameType !== undefined) {
    rule.postalCodeNameMessageId = POSTAL_CODE_NAME_IDS[zipNameType];
  }

  const localityNameType = str("locality_name_type");
  if (localityNameType !== undefined) {
    rule.localityNameMessageId = LOCALITY_NAME_IDS[localityNameType];
  }

  const sublocalityNameType = str("sublocality_name_type");
  if (sublocalityNameType !== undefined) {
    rule.sublocalityNameMessageId = SUBLOCALITY_NAME_IDS[sublocalityNameType];
  }

  const name = str("name");
  if (name !== undefined) rule.name = name;

  const latinName = str("lname");
  if (latinName !== undefined) rule.latinName = latinName;

  const zipex = str("zipex");
  if (zipex !== undefined) rule.postalCodeExample = zipex;

  const posturl = str("posturl");
  if (posturl !== undefined) rule.postServiceUrl = posturl;

  return rule;
}
