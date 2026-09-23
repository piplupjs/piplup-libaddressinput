// Port of cpp/src/address_field_util.cc (Apache-2.0, Google Inc.).
//
// Parses the `fmt`/`lfmt` format strings and the `require` field-list string
// from the address metadata JSON (see rule.ts, Phase 1).

import type { AddressField } from "../address-field.js";
import {
  fieldElement,
  literalElement,
  newlineElement,
  type FormatElement,
} from "./format-element.js";

// Mirrors kTokenMap in address_field_util.cc exactly, including the field
// order (which matches AddressField's declaration order upstream).
const TOKEN_TO_FIELD: Record<string, AddressField> = {
  R: "COUNTRY",
  S: "ADMIN_AREA",
  C: "LOCALITY",
  D: "DEPENDENT_LOCALITY",
  X: "SORTING_CODE",
  Z: "POSTAL_CODE",
  A: "STREET_ADDRESS",
  O: "ORGANIZATION",
  N: "RECIPIENT",
};

function parseFieldToken(c: string): AddressField | undefined {
  return TOKEN_TO_FIELD[c];
}

/**
 * Parses a `fmt`/`lfmt` format string into a sequence of format elements:
 * field placeholders (`%A`, `%C`, ...), newlines (`%n`), and literal runs of
 * text. Unknown `%<token>` sequences are dropped, matching upstream.
 */
export function parseFormatRule(format: string): FormatElement[] {
  const elements: FormatElement[] = [];
  let i = 0;
  let literalStart = 0;

  while (i < format.length) {
    const percentIndex = format.indexOf("%", i);
    if (percentIndex === -1) {
      break;
    }
    if (literalStart < percentIndex) {
      elements.push(literalElement(format.slice(literalStart, percentIndex)));
    }
    const tokenIndex = percentIndex + 1;
    if (tokenIndex >= format.length) {
      // Trailing "%" with no token: nothing more to push (matches upstream,
      // which breaks out before recording a literal here).
      literalStart = format.length;
      i = format.length;
      break;
    }
    const token = format[tokenIndex] as string;
    if (token === "n") {
      elements.push(newlineElement());
    } else {
      const field = parseFieldToken(token);
      if (field !== undefined) {
        elements.push(fieldElement(field));
      }
      // Unknown token: silently ignored, matching upstream.
    }
    literalStart = tokenIndex + 1;
    i = literalStart;
  }

  if (literalStart < format.length) {
    elements.push(literalElement(format.slice(literalStart)));
  }

  return elements;
}

/**
 * Parses a `require` string (e.g. "ACSZ") into the list of required address
 * fields. Unknown characters are dropped, matching upstream.
 */
export function parseAddressFieldsRequired(required: string): AddressField[] {
  const fields: AddressField[] = [];
  for (const c of required) {
    const field = parseFieldToken(c);
    if (field !== undefined) {
      fields.push(field);
    }
  }
  return fields;
}
