// English message pack, extracted 1:1 from cpp/res/messages.grdp
// (Apache-2.0, Google Inc.). `<ph name="X">$N<ex>...</ex></ph>` markup is
// flattened to the bare `$N` placeholder.

import type { MessageId } from "../messages.js";

export const en: Record<MessageId, string> = {
  COUNTRY_OR_REGION_LABEL: "Country / Region",
  LOCALITY_LABEL: "City",
  POST_TOWN: "Post Town",
  SUBURB: "Suburb",
  TOWNLAND: "Townland",
  VILLAGE_TOWNSHIP: "Village / Township",
  ADDRESS_LINE_1_LABEL: "Street address",
  EIR_CODE_LABEL: "Eircode",
  PIN_CODE_LABEL: "PIN code",
  POSTAL_CODE_LABEL: "Postal code",
  ZIP_CODE_LABEL: "ZIP code",
  AREA: "Area",
  COUNTY: "County",
  DEPARTMENT: "Department",
  DISTRICT: "District",
  DO_SI: "Do/Si",
  EMIRATE: "Emirate",
  ISLAND: "Island",
  OBLAST: "Oblast",
  PARISH: "Parish",
  PREFECTURE: "Prefecture",
  PROVINCE: "Province",
  STATE: "State",
  ORGANIZATION_LABEL: "Organization",
  RECIPIENT_LABEL: "Name",
  NEIGHBORHOOD: "Neighborhood",
  MISSING_REQUIRED_FIELD: "You can't leave this empty.",
  MISSING_REQUIRED_POSTAL_CODE_EXAMPLE_AND_URL:
    "You must provide a postal code, for example $1. Don't know your postal code? Find it out $2here$3.",
  MISSING_REQUIRED_POSTAL_CODE_EXAMPLE: "You must provide a postal code, for example $1.",
  MISSING_REQUIRED_ZIP_CODE_EXAMPLE_AND_URL:
    "You must provide a ZIP code, for example $1. Don't know your ZIP code? Find it out $2here$3.",
  MISSING_REQUIRED_ZIP_CODE_EXAMPLE: "You must provide a ZIP code, for example $1.",
  UNKNOWN_VALUE: "$1 is not recognized as a known value for this field.",
  UNRECOGNIZED_FORMAT_POSTAL_CODE_EXAMPLE_AND_URL:
    "This postal code format is not recognized. Example of a valid postal code: $1. Don't know your postal code? Find it out $2here$3.",
  UNRECOGNIZED_FORMAT_POSTAL_CODE_EXAMPLE:
    "This postal code format is not recognized. Example of a valid postal code: $1.",
  UNRECOGNIZED_FORMAT_POSTAL_CODE: "This postal code format is not recognized.",
  UNRECOGNIZED_FORMAT_ZIP_CODE_EXAMPLE_AND_URL:
    "This ZIP code format is not recognized. Example of a valid ZIP code: $1. Don't know your ZIP code? Find it out $2here$3.",
  UNRECOGNIZED_FORMAT_ZIP_CODE_EXAMPLE:
    "This ZIP code format is not recognized. Example of a valid ZIP code: $1.",
  UNRECOGNIZED_FORMAT_ZIP: "This ZIP code format is not recognized.",
  MISMATCHING_VALUE_POSTAL_CODE_URL:
    "This postal code does not appear to match the rest of this address. Don't know your postal code? Find it out $1here$2.",
  MISMATCHING_VALUE_POSTAL_CODE: "This postal code does not appear to match the rest of this address.",
  MISMATCHING_VALUE_ZIP_URL:
    "This ZIP code does not appear to match the rest of this address. Don't know your ZIP code? Find it out $1here$2.",
  MISMATCHING_VALUE_ZIP: "This ZIP code does not appear to match the rest of this address.",
  PO_BOX_FORBIDDEN_VALUE:
    "This address line appears to contain a post office box. Please use a street or building address.",
};
