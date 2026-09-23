// Ported from cpp/test/language_test.cc (Apache-2.0, Google Inc.).
//
// chooseBestAddressLanguage() has no dedicated upstream unit test (it's
// exercised indirectly via address_ui_test.cc); that coverage lands in
// Phase 6 when buildLayout() is implemented.

import { describe, expect, it } from "vitest";
import { parseLanguage } from "./language.js";

describe("parseLanguage (LanguageTestCases)", () => {
  const cases: [string, string, string, boolean][] = [
    ["", "", "", false],
    ["en", "en", "en", false],
    ["zh-Latn-CN", "zh-Latn-CN", "zh", true],
    ["zh-cmn-Latn-CN", "zh-cmn-Latn-CN", "zh", true],
    ["zh-Hans", "zh-Hans", "zh", false],
    ["en_GB", "en-GB", "en", false],
  ];

  it.each(cases)(
    "%j -> tag=%j base=%j latin=%j",
    (input, expectedTag, expectedBase, expectedHasLatinScript) => {
      const language = parseLanguage(input);
      expect(language.tag).toBe(expectedTag);
      expect(language.base).toBe(expectedBase);
      expect(language.hasLatinScript).toBe(expectedHasLatinScript);
    },
  );
});
