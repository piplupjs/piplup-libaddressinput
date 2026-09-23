// Port of cpp/src/format_element.h / .cc (Apache-2.0, Google Inc.).
//
// A token in a format string: either an address field placeholder, a
// newline, or a literal string. Upstream represents this as a class with an
// unused `field_` defaulted to COUNTRY when the element is a literal or
// newline; here it's a discriminated union instead, which is equivalent and
// idiomatic in TS (see .planning/PLAN.md Phase 1).

import type { AddressField } from "../address-field.js";

export interface FieldElement {
  kind: "field";
  field: AddressField;
}

export interface NewlineElement {
  kind: "newline";
}

export interface LiteralElement {
  kind: "literal";
  literal: string;
}

export type FormatElement = FieldElement | NewlineElement | LiteralElement;

export function fieldElement(field: AddressField): FieldElement {
  return { kind: "field", field };
}

export function newlineElement(): NewlineElement {
  return { kind: "newline" };
}

export function literalElement(literal: string): LiteralElement {
  if (literal.length === 0) {
    throw new Error("literalElement: literal must not be empty");
  }
  return { kind: "literal", literal };
}

export function formatElementsEqual(a: FormatElement, b: FormatElement): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "field" && b.kind === "field") return a.field === b.field;
  if (a.kind === "literal" && b.kind === "literal") return a.literal === b.literal;
  return true; // both newline
}
