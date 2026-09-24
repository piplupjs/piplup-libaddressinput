// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Headless enforcement (PLAN.md §1.1): ban DOM/browser globals anywhere in
// packages/core so the library can never silently gain a runtime dependency
// on a browser or Node-specific host object. Examples/ are exempt.
const BANNED_GLOBALS = [
  "document",
  "window",
  "navigator",
  "HTMLElement",
  "localStorage",
  "sessionStorage",
  "location",
  "history",
  "alert",
  "confirm",
  "prompt",
];

export default tseslint.config(
  {
    // test/golden/cpp-harness/*.cjs: plain Node CommonJS maintenance
    // scripts for the golden cross-check (see test/golden/README.md), not
    // part of the TS/ESM app — out of scope for these rules.
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "third_party/**",
      ".build-deps/**",
      "test/golden/cpp-harness/**/*.cjs",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...BANNED_GLOBALS.map((name) => ({
          name,
          message:
            "Headless library code must not reference browser/DOM globals. " +
            "Inject the capability instead (see PLAN.md §1).",
        })),
      ],
    },
  },
  {
    files: ["**/*.test.ts", "**/test/**/*.ts"],
    rules: {
      "no-restricted-globals": "off",
    },
  },
);
