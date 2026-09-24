// Port of cpp/src/address_ui.cc's `BuildComponents`/`BuildComponentsWithLiterals`
// (Apache-2.0, Google Inc.), reshaped as a headless, data-only layout
// descriptor instead of upstream's `AddressUiComponent` + `Localization`
// pairing — see .planning/PLAN.md §5/§6 Phase 6. Fully synchronous: like
// the formatter, it only needs the bundled fallback data, no supplier.

import type { AddressField } from "./address-field.js";
import type { FormatElement } from "./internal/format-element.js";
import { chooseBestAddressLanguage, parseLanguage } from "./internal/language.js";
import * as RegionDataConstants from "./internal/region-data-constants.js";
import { parseRule } from "./internal/rule.js";
import { getFieldLabelId, type MessageId } from "./messages.js";

export interface LayoutField {
  kind: "field";
  field: AddressField;
  /**
   * The field's label, as a message id (see messages.ts) — `undefined` when
   * the region's rule doesn't specify a name type for this field (matches
   * upstream's `INVALID_MESSAGE_ID` case) — and the literal string
   * `"CEDEX"` for SORTING_CODE, which upstream says "needs no translation
   * as it's used only in one locale".
   */
  labelId: MessageId | "CEDEX" | undefined;
  /** From the rule's `require` list — not part of upstream's AddressUiComponent (see below). */
  required: boolean;
  /**
   * `'long'` iff the field is alone on its format line (preceded and
   * followed by a newline, or a format edge); `'short'` otherwise. Ported
   * directly from `BuildComponents`'s preceded/followed-by-newline logic.
   */
  length: "short" | "long";
  /** True only for STREET_ADDRESS — the field that spans multiple address lines. */
  multiline: boolean;
}

export interface LayoutLiteral {
  kind: "literal";
  text: string;
}

export type LayoutRowItem = LayoutField | LayoutLiteral;

export interface AddressLayout {
  regionCode: string;
  /** The BCP-47 language tag `labelId`s (and the chosen format) are in. */
  languageTag: string;
  /** Rows are format lines (split on `%n`); each row is field/literal items in order. */
  rows: LayoutRowItem[][];
}

export interface BuildLayoutOptions {
  /**
   * Include literal text runs (e.g. ", ", country-specific words) as row
   * items. Default false. Unlike upstream's `BuildComponentsWithLiterals`,
   * a newline is never itself emitted as a literal item — a row boundary
   * already conveys the line break, which is the more useful shape for a
   * headless caller laying out a form.
   */
  includeLiterals?: boolean;
}

// Also intentionally dropped vs. upstream's plan sketch: no `options`
// (region choices) field here. Building those needs a Supplier and is
// async (see region-data.ts's buildRegionTree, Phase 5); buildLayout stays
// synchronous like the formatter. Combine both calls' results yourself.

const LABEL_OVERRIDE: Partial<Record<AddressField, MessageId | "CEDEX">> = {
  SORTING_CODE: "CEDEX",
};

/**
 * Builds a headless form-layout descriptor for a region: which fields to
 * show, grouped into rows, with a label id, required flag, and length hint
 * for each. Returns an empty `rows` array for an unsupported region code
 * (matches upstream's "empty vector on error").
 */
export function buildLayout(
  regionCode: string,
  uiLanguageTag: string,
  options: BuildLayoutOptions = {},
): AddressLayout {
  const { includeLiterals = false } = options;

  const rule = parseRule(
    RegionDataConstants.getRegionData(regionCode),
    RegionDataConstants.getDefaultRule(),
  );
  if (rule === undefined) {
    return { regionCode, languageTag: "", rows: [] };
  }

  const bestLanguage = chooseBestAddressLanguage(rule, parseLanguage(uiLanguageTag));
  const format: FormatElement[] =
    rule.latinFormat.length > 0 && bestLanguage.hasLatinScript ? rule.latinFormat : rule.format;

  const rows: LayoutRowItem[][] = [[]];
  const seenFields = new Set<AddressField>();
  let precededByNewline = true;

  for (let i = 0; i < format.length; i++) {
    const element = format[i]!;

    if (element.kind !== "field") {
      if (includeLiterals && element.kind === "literal") {
        rows[rows.length - 1]!.push({ kind: "literal", text: element.literal });
      }
      if (element.kind === "newline") {
        precededByNewline = true;
        rows.push([]);
      }
      continue;
    }

    if (seenFields.has(element.field)) {
      // A field repeated in the format (e.g. shown twice on an envelope) is
      // only shown once — matches upstream's std::set<AddressField> dedup.
      continue;
    }
    seenFields.add(element.field);

    const next = format[i + 1];
    const followedByNewline = next === undefined || next.kind === "newline";
    const length: "short" | "long" = precededByNewline && followedByNewline ? "long" : "short";
    precededByNewline = false;

    rows[rows.length - 1]!.push({
      kind: "field",
      field: element.field,
      labelId: LABEL_OVERRIDE[element.field] ?? getFieldLabelId(element.field, rule),
      required: rule.required.includes(element.field),
      length,
      multiline: element.field === "STREET_ADDRESS",
    });
  }

  return { regionCode, languageTag: bestLanguage.tag, rows };
}

/** All supported CLDR region codes. Mirrors `GetRegionCodes`. */
export function getRegionCodes(): readonly string[] {
  return RegionDataConstants.getRegionCodes();
}
