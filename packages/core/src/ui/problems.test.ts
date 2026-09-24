import { describe, expect, it } from "vitest";
import {
  isUserProblem,
  getUserProblems,
  getProblemErrorMessage,
  groupProblemsByField,
} from "./problems.js";
import type { ValidationProblem } from "../validator.js";

describe("ui/problems", () => {
  it("identifies user problems correctly", () => {
    expect(isUserProblem("MISSING_REQUIRED_FIELD")).toBe(true);
    expect(isUserProblem("INVALID_FORMAT")).toBe(true);
    expect(isUserProblem("UNKNOWN_VALUE")).toBe(true);
    expect(isUserProblem("MISMATCHING_VALUE")).toBe(true);
    expect(isUserProblem("USES_P_O_BOX")).toBe(true);
    expect(isUserProblem("UNEXPECTED_FIELD")).toBe(true);
    // UNSUPPORTED_FIELD is internal metadata, not a user validation error
    expect(isUserProblem("UNSUPPORTED_FIELD")).toBe(false);
  });

  it("filters out UNSUPPORTED_FIELD problems", () => {
    const problems: ValidationProblem[] = [
      { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
      { field: "POSTAL_CODE", problem: "MISSING_REQUIRED_FIELD" },
      { field: "DEPENDENT_LOCALITY", problem: "UNSUPPORTED_FIELD" },
    ];
    const userProblems = getUserProblems(problems);
    expect(userProblems).toEqual([
      { field: "POSTAL_CODE", problem: "MISSING_REQUIRED_FIELD" },
    ]);
  });

  it("formats user-friendly error messages", () => {
    expect(
      getProblemErrorMessage({ field: "POSTAL_CODE", problem: "MISSING_REQUIRED_FIELD" }),
    ).toBe("You can't leave this empty.");

    expect(
      getProblemErrorMessage({ field: "POSTAL_CODE", problem: "INVALID_FORMAT" }),
    ).toBe("This postal code format is not recognized.");

    expect(
      getProblemErrorMessage({ field: "ADMIN_AREA", problem: "UNKNOWN_VALUE" }),
    ).toBe("This value is not recognized.");

    expect(
      getProblemErrorMessage({ field: "STREET_ADDRESS", problem: "USES_P_O_BOX" }),
    ).toBe(
      "This address line appears to contain a post office box. Please use a street or building address.",
    );
  });

  it("groups user problems by field", () => {
    const problems: ValidationProblem[] = [
      { field: "POSTAL_CODE", problem: "MISSING_REQUIRED_FIELD" },
      { field: "POSTAL_CODE", problem: "INVALID_FORMAT" },
      { field: "LOCALITY", problem: "UNSUPPORTED_FIELD" },
    ];
    const grouped = groupProblemsByField(problems);
    expect(grouped.POSTAL_CODE).toHaveLength(2);
    expect(grouped.LOCALITY).toBeUndefined();
  });
});
