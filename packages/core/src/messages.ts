// Port of the message-id surface of cpp/include/libaddressinput/localization.h
// + cpp/src/address_ui.cc's `GetLabelForField` + cpp/src/localization.cc's
// `GetErrorMessage`/`GetErrorMessageForPostalCode` (Apache-2.0, Google Inc.),
// reshaped to be headless: instead of returning a resolved string, this
// module returns a message id + positional params, and a separate,
// tree-shakeable package (messages/en.ts) resolves those into English text.
// A consumer supplying their own translations only ever needs this module.

import type { AddressData } from "./address-data.js";
import type { AddressField } from "./address-field.js";
import type { AddressProblem } from "./problem.js";
import type { Rule } from "./internal/rule.js";
import { getFieldValue } from "./address-data.js";

// Every IDS_LIBADDRESSINPUT_* id from cpp/res/messages.grdp that this port
// uses (all of them — the grdp has no ids this library doesn't need).
export type MessageId =
  | "COUNTRY_OR_REGION_LABEL"
  | "LOCALITY_LABEL"
  | "POST_TOWN"
  | "SUBURB"
  | "TOWNLAND"
  | "VILLAGE_TOWNSHIP"
  | "ADDRESS_LINE_1_LABEL"
  | "EIR_CODE_LABEL"
  | "PIN_CODE_LABEL"
  | "POSTAL_CODE_LABEL"
  | "ZIP_CODE_LABEL"
  | "AREA"
  | "COUNTY"
  | "DEPARTMENT"
  | "DISTRICT"
  | "DO_SI"
  | "EMIRATE"
  | "ISLAND"
  | "OBLAST"
  | "PARISH"
  | "PREFECTURE"
  | "PROVINCE"
  | "STATE"
  | "ORGANIZATION_LABEL"
  | "RECIPIENT_LABEL"
  | "NEIGHBORHOOD"
  | "MISSING_REQUIRED_FIELD"
  | "MISSING_REQUIRED_POSTAL_CODE_EXAMPLE_AND_URL"
  | "MISSING_REQUIRED_POSTAL_CODE_EXAMPLE"
  | "MISSING_REQUIRED_ZIP_CODE_EXAMPLE_AND_URL"
  | "MISSING_REQUIRED_ZIP_CODE_EXAMPLE"
  | "UNKNOWN_VALUE"
  | "UNRECOGNIZED_FORMAT_POSTAL_CODE_EXAMPLE_AND_URL"
  | "UNRECOGNIZED_FORMAT_POSTAL_CODE_EXAMPLE"
  | "UNRECOGNIZED_FORMAT_POSTAL_CODE"
  | "UNRECOGNIZED_FORMAT_ZIP_CODE_EXAMPLE_AND_URL"
  | "UNRECOGNIZED_FORMAT_ZIP_CODE_EXAMPLE"
  | "UNRECOGNIZED_FORMAT_ZIP"
  | "MISMATCHING_VALUE_POSTAL_CODE_URL"
  | "MISMATCHING_VALUE_POSTAL_CODE"
  | "MISMATCHING_VALUE_ZIP_URL"
  | "MISMATCHING_VALUE_ZIP"
  | "PO_BOX_FORBIDDEN_VALUE";

// Mirrors rule.ts's NameTypeMessageId ids (state/postal/locality/sublocality
// name-type labels) 1:1 — re-exported under the MessageId names above so
// layout.ts and this module share one id space. (rule.ts can't import from
// here without a cycle, so the mapping lives here instead.)
import type { NameTypeMessageId } from "./internal/rule.js";

const NAME_TYPE_TO_MESSAGE_ID: Record<NameTypeMessageId, MessageId> = {
  IDS_LIBADDRESSINPUT_AREA: "AREA",
  IDS_LIBADDRESSINPUT_COUNTY: "COUNTY",
  IDS_LIBADDRESSINPUT_DEPARTMENT: "DEPARTMENT",
  IDS_LIBADDRESSINPUT_DISTRICT: "DISTRICT",
  IDS_LIBADDRESSINPUT_DO_SI: "DO_SI",
  IDS_LIBADDRESSINPUT_EMIRATE: "EMIRATE",
  IDS_LIBADDRESSINPUT_ISLAND: "ISLAND",
  IDS_LIBADDRESSINPUT_OBLAST: "OBLAST",
  IDS_LIBADDRESSINPUT_PARISH: "PARISH",
  IDS_LIBADDRESSINPUT_PREFECTURE: "PREFECTURE",
  IDS_LIBADDRESSINPUT_PROVINCE: "PROVINCE",
  IDS_LIBADDRESSINPUT_STATE: "STATE",
  IDS_LIBADDRESSINPUT_EIR_CODE_LABEL: "EIR_CODE_LABEL",
  IDS_LIBADDRESSINPUT_PIN_CODE_LABEL: "PIN_CODE_LABEL",
  IDS_LIBADDRESSINPUT_POSTAL_CODE_LABEL: "POSTAL_CODE_LABEL",
  IDS_LIBADDRESSINPUT_ZIP_CODE_LABEL: "ZIP_CODE_LABEL",
  IDS_LIBADDRESSINPUT_LOCALITY_LABEL: "LOCALITY_LABEL",
  IDS_LIBADDRESSINPUT_POST_TOWN: "POST_TOWN",
  IDS_LIBADDRESSINPUT_SUBURB: "SUBURB",
  IDS_LIBADDRESSINPUT_NEIGHBORHOOD: "NEIGHBORHOOD",
  IDS_LIBADDRESSINPUT_TOWNLAND: "TOWNLAND",
  IDS_LIBADDRESSINPUT_VILLAGE_TOWNSHIP: "VILLAGE_TOWNSHIP",
};

/**
 * The message id for a field's UI label, given its region's rule. Mirrors
 * `GetLabelForField`, minus the `SORTING_CODE` special case (upstream
 * returns the literal `"CEDEX"` there, needing no translation — callers
 * building a layout should special-case it the same way; see layout.ts).
 * Returns `undefined` when the rule doesn't specify a name type for a
 * hierarchical field (ADMIN_AREA/LOCALITY/DEPENDENT_LOCALITY/POSTAL_CODE) —
 * matches upstream's `INVALID_MESSAGE_ID` case, which resolves to no string.
 */
export function getFieldLabelId(field: AddressField, rule: Rule): MessageId | undefined {
  switch (field) {
    case "COUNTRY":
      return "COUNTRY_OR_REGION_LABEL";
    case "ADMIN_AREA":
      return rule.adminAreaNameMessageId
        ? NAME_TYPE_TO_MESSAGE_ID[rule.adminAreaNameMessageId]
        : undefined;
    case "LOCALITY":
      return rule.localityNameMessageId
        ? NAME_TYPE_TO_MESSAGE_ID[rule.localityNameMessageId]
        : undefined;
    case "DEPENDENT_LOCALITY":
      return rule.sublocalityNameMessageId
        ? NAME_TYPE_TO_MESSAGE_ID[rule.sublocalityNameMessageId]
        : undefined;
    case "POSTAL_CODE":
      return rule.postalCodeNameMessageId
        ? NAME_TYPE_TO_MESSAGE_ID[rule.postalCodeNameMessageId]
        : undefined;
    case "STREET_ADDRESS":
      return "ADDRESS_LINE_1_LABEL";
    case "ORGANIZATION":
      return "ORGANIZATION_LABEL";
    case "RECIPIENT":
      return "RECIPIENT_LABEL";
    case "SORTING_CODE":
      return undefined; // Literal "CEDEX" — see layout.ts.
    default:
      return undefined;
  }
}

export interface ProblemMessage {
  id: MessageId;
  /** Positional params substituted for $1, $2, ... in the message template. */
  params: string[];
}

export interface GetProblemMessageOptions {
  /** Include a postal-code example in the message, when available. Default true. */
  enableExamples?: boolean;
  /** Include an HTML link to the postal service, when available. Default true. */
  enableLinks?: boolean;
}

function pushUrlParams(url: string, params: string[]): void {
  // Matches upstream's PushBackUrl exactly, including embedding raw HTML —
  // see this file's header comment on why that's kept as-is.
  params.push(`<a href="${url}">`, "</a>");
}

/**
 * The problem message for one field/problem pair, as a message id + params
 * ready for `messages/en.ts`'s `formatMessage` (or a consumer's own
 * translation table keyed the same way). Mirrors
 * `Localization::GetErrorMessage` + `GetErrorMessageForPostalCode`.
 */
export function getProblemMessage(
  address: AddressData,
  field: AddressField,
  problem: AddressProblem,
  countryRule: Rule,
  options: GetProblemMessageOptions = {},
): ProblemMessage {
  const { enableExamples = true, enableLinks = true } = options;

  if (field === "POSTAL_CODE") {
    const postalCodeExample = enableExamples
      ? (countryRule.postalCodeExample.split(",")[0] ?? "")
      : "";
    const postServiceUrl = enableLinks ? countryRule.postServiceUrl : "";
    const usesPostalCodeAsLabel =
      countryRule.postalCodeNameMessageId === "IDS_LIBADDRESSINPUT_POSTAL_CODE_LABEL";
    return getPostalCodeProblemMessage(
      problem,
      usesPostalCodeAsLabel,
      postalCodeExample,
      postServiceUrl,
    );
  }

  if (problem === "MISSING_REQUIRED_FIELD") {
    return { id: "MISSING_REQUIRED_FIELD", params: [] };
  }
  if (problem === "UNKNOWN_VALUE") {
    const value =
      field === "STREET_ADDRESS" ? (address.addressLine?.[0] ?? "") : getFieldValue(address, field);
    return { id: "UNKNOWN_VALUE", params: [value] };
  }
  if (problem === "USES_P_O_BOX") {
    return { id: "PO_BOX_FORBIDDEN_VALUE", params: [] };
  }
  throw new Error(`getProblemMessage: unsupported (field, problem) pair: (${field}, ${problem})`);
}

function getPostalCodeProblemMessage(
  problem: AddressProblem,
  usesPostalCodeAsLabel: boolean,
  postalCodeExample: string,
  postServiceUrl: string,
): ProblemMessage {
  const params: string[] = [];

  if (problem === "MISSING_REQUIRED_FIELD") {
    let id: MessageId;
    if (postalCodeExample.length > 0 && postServiceUrl.length > 0) {
      id = usesPostalCodeAsLabel
        ? "MISSING_REQUIRED_POSTAL_CODE_EXAMPLE_AND_URL"
        : "MISSING_REQUIRED_ZIP_CODE_EXAMPLE_AND_URL";
      params.push(postalCodeExample);
      pushUrlParams(postServiceUrl, params);
    } else if (postalCodeExample.length > 0) {
      id = usesPostalCodeAsLabel
        ? "MISSING_REQUIRED_POSTAL_CODE_EXAMPLE"
        : "MISSING_REQUIRED_ZIP_CODE_EXAMPLE";
      params.push(postalCodeExample);
    } else {
      id = "MISSING_REQUIRED_FIELD";
    }
    return { id, params };
  }

  if (problem === "INVALID_FORMAT") {
    let id: MessageId;
    if (postalCodeExample.length > 0 && postServiceUrl.length > 0) {
      id = usesPostalCodeAsLabel
        ? "UNRECOGNIZED_FORMAT_POSTAL_CODE_EXAMPLE_AND_URL"
        : "UNRECOGNIZED_FORMAT_ZIP_CODE_EXAMPLE_AND_URL";
      params.push(postalCodeExample);
      pushUrlParams(postServiceUrl, params);
    } else if (postalCodeExample.length > 0) {
      id = usesPostalCodeAsLabel
        ? "UNRECOGNIZED_FORMAT_POSTAL_CODE_EXAMPLE"
        : "UNRECOGNIZED_FORMAT_ZIP_CODE_EXAMPLE";
      params.push(postalCodeExample);
    } else {
      id = usesPostalCodeAsLabel ? "UNRECOGNIZED_FORMAT_POSTAL_CODE" : "UNRECOGNIZED_FORMAT_ZIP";
    }
    return { id, params };
  }

  if (problem === "MISMATCHING_VALUE") {
    let id: MessageId;
    if (postServiceUrl.length > 0) {
      id = usesPostalCodeAsLabel ? "MISMATCHING_VALUE_POSTAL_CODE_URL" : "MISMATCHING_VALUE_ZIP_URL";
      pushUrlParams(postServiceUrl, params);
    } else {
      id = usesPostalCodeAsLabel ? "MISMATCHING_VALUE_POSTAL_CODE" : "MISMATCHING_VALUE_ZIP";
    }
    return { id, params };
  }

  throw new Error(`getProblemMessage: unsupported postal-code problem: ${problem}`);
}
