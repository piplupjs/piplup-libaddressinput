// Port of cpp/src/address_formatter.cc (Apache-2.0, Google Inc.).

import { getFieldValue, isFieldEmpty, type AddressData } from "./address-data.js";
import type { FormatElement } from "./internal/format-element.js";
import { parseLanguage } from "./internal/language.js";
import * as RegionDataConstants from "./internal/region-data-constants.js";
import { parseRule } from "./internal/rule.js";

const COMMA_SEPARATOR = ", ";
const SPACE_SEPARATOR = " ";
const ARABIC_COMMA_SEPARATOR = "، ";

const LANGUAGES_THAT_USE_SPACE = ["th", "ko"];
const LANGUAGES_THAT_HAVE_NO_SEPARATOR = ["ja", "zh"]; // All Chinese variants.
// Based on CLDR, cross-checked with data from Chrome linguists, for
// languages in official use in some country where Arabic is the most likely
// script tag (matches upstream's TODO about tr-Arab verbatim).
const LANGUAGES_THAT_USE_AN_ARABIC_COMMA = ["ar", "fa", "ku", "ps", "ur"];

function getLineSeparatorForLanguage(languageTag: string | undefined): string {
  const language = parseLanguage(languageTag ?? "");

  if (language.hasLatinScript) {
    return COMMA_SEPARATOR;
  }

  const base = language.base.toLowerCase();
  if (LANGUAGES_THAT_USE_SPACE.includes(base)) {
    return SPACE_SEPARATOR;
  }
  if (LANGUAGES_THAT_HAVE_NO_SEPARATOR.includes(base)) {
    return "";
  }
  if (LANGUAGES_THAT_USE_AN_ARABIC_COMMA.includes(base)) {
    return ARABIC_COMMA_SEPARATOR;
  }
  // Either a Latin-script language or none specified; ", " is the most
  // common separator and a reasonable default (matches upstream's comment).
  return COMMA_SEPARATOR;
}

function combineLinesForLanguage(
  lines: string[],
  languageTag: string | undefined,
): string {
  return lines.join(getLineSeparatorForLanguage(languageTag));
}

/**
 * Formats an address into national-format lines. Mirrors
 * `GetFormattedNationalAddress`: unused format elements (literals adjacent
 * to an empty field) are pruned, and STREET_ADDRESS expands to one line per
 * `addressLine` entry.
 */
export function formatAddress(address: AddressData): string[] {
  // Matches upstream exactly: it never checks ParseSerializedRule's return
  // value here, so a region with no data (or an unsupported/empty region
  // code) just keeps using the default-only rule instead of failing —
  // parseRule() returns undefined in that case (see internal/rule.ts), so
  // fall back to the default rule explicitly rather than asserting non-null.
  const defaultRule = RegionDataConstants.getDefaultRule();
  const rule =
    parseRule(RegionDataConstants.getRegionData(address.regionCode), defaultRule) ??
    defaultRule;

  const language = parseLanguage(address.languageCode ?? "");
  const format: FormatElement[] =
    language.hasLatinScript && rule.latinFormat.length > 0
      ? rule.latinFormat
      : rule.format;

  // Prune literals that would otherwise sit next to a field we're about to
  // drop because it's empty. A literal survives only if:
  //  (1) it's not immediately followed by an empty field, and
  //  (2) it's not immediately preceded by a field we just dropped.
  const prunedFormat: FormatElement[] = [];
  for (let i = 0; i < format.length; i++) {
    const element = format[i]!;
    if (element.kind === "newline") {
      prunedFormat.push(element);
      continue;
    }
    if (element.kind === "field") {
      if (!isFieldEmpty(address, element.field)) {
        prunedFormat.push(element);
      }
      continue;
    }
    // Literal.
    const next = format[i + 1];
    const notBeforeEmptyField =
      next === undefined || next.kind !== "field" || !isFieldEmpty(address, next.field);
    const prev = format[i - 1];
    const notAfterDroppedField =
      prev === undefined ||
      prev.kind !== "field" ||
      (prunedFormat.length > 0 &&
        prunedFormat[prunedFormat.length - 1]!.kind === "field");
    if (notBeforeEmptyField && notAfterDroppedField) {
      prunedFormat.push(element);
    }
  }

  const lines: string[] = [];
  let line = "";
  for (const element of prunedFormat) {
    if (element.kind === "newline") {
      if (line.length > 0) {
        lines.push(line);
        line = "";
      }
    } else if (element.kind === "field") {
      if (element.field === "STREET_ADDRESS") {
        // Matches upstream exactly: once we know at least one line is
        // non-blank (the field isn't "empty"), every line is used as-is,
        // including any blank ones in the middle — no per-line filtering.
        if (!isFieldEmpty(address, "STREET_ADDRESS")) {
          const addressLines = address.addressLine ?? [];
          line += addressLines[0];
          if (addressLines.length > 1) {
            lines.push(line);
            line = "";
            for (let i = 1; i < addressLines.length - 1; i++) {
              lines.push(addressLines[i]!);
            }
            line += addressLines[addressLines.length - 1];
          }
        }
      } else {
        line += getFieldValue(address, element.field);
      }
    } else {
      line += element.literal;
    }
  }
  if (line.length > 0) {
    lines.push(line);
  }
  return lines;
}

/** Mirrors `GetFormattedNationalAddressLine`. */
export function formatAddressAsSingleLine(address: AddressData): string {
  return combineLinesForLanguage(formatAddress(address), address.languageCode);
}

/** Mirrors `GetStreetAddressLinesAsSingleLine`. */
export function getStreetAddressLinesAsSingleLine(address: AddressData): string {
  return combineLinesForLanguage(address.addressLine ?? [], address.languageCode);
}
