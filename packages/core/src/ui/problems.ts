import type { AddressField } from "../address-field.js";
import { en } from "../messages/en.js";
import type { AddressProblem } from "../problem.js";
import type { ValidationProblem } from "../validator.js";

/**
 * Returns true if the problem represents a user-actionable validation error.
 * Excludes internal metadata flags like UNSUPPORTED_FIELD (which indicates the
 * rule database lacks sub-rules below a given depth, e.g. cities in US or IN,
 * not that the user entered an invalid address).
 */
export function isUserProblem(problem: ValidationProblem | AddressProblem): boolean {
  const type = typeof problem === "string" ? problem : problem.problem;
  return type !== "UNSUPPORTED_FIELD";
}

/**
 * Filters a list of ValidationProblems down to user-actionable errors,
 * removing internal metadata flags like UNSUPPORTED_FIELD.
 */
export function getUserProblems(problems: ValidationProblem[]): ValidationProblem[] {
  return problems.filter(isUserProblem);
}

/**
 * Returns a human-friendly error message for a given ValidationProblem.
 *
 * @param problem The ValidationProblem returned by validate().
 * @param messages Optional localized message dictionary (defaults to English).
 */
export function getProblemErrorMessage(
  problem: ValidationProblem,
  messages: Record<string, string> = en,
): string {
  switch (problem.problem) {
    case "MISSING_REQUIRED_FIELD":
      return messages["MISSING_REQUIRED_FIELD"] ?? "You can't leave this empty.";
    case "INVALID_FORMAT":
      return (
        messages["UNRECOGNIZED_FORMAT_POSTAL_CODE"] ?? "Invalid format for this field."
      );
    case "UNKNOWN_VALUE":
      return "This value is not recognized.";
    case "MISMATCHING_VALUE":
      return (
        messages["MISMATCHING_VALUE_POSTAL_CODE"] ??
        "This value does not match the surrounding region."
      );
    case "UNEXPECTED_FIELD":
      return "This field is not expected for this region.";
    case "USES_P_O_BOX":
      return messages["PO_BOX_FORBIDDEN_VALUE"] ?? "P.O. boxes are not allowed here.";
    case "UNSUPPORTED_FIELD":
      return "";
    default:
      return problem.problem;
  }
}

/**
 * Groups validation problems by field, filtering out non-user problems.
 * Useful for mapping directly to per-field error containers in a form.
 */
export function groupProblemsByField(
  problems: ValidationProblem[],
): Partial<Record<AddressField, ValidationProblem[]>> {
  const map: Partial<Record<AddressField, ValidationProblem[]>> = {};
  for (const p of problems) {
    if (!isUserProblem(p)) continue;
    const existing = map[p.field];
    if (existing) {
      existing.push(p);
    } else {
      map[p.field] = [p];
    }
  }
  return map;
}
