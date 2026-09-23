// Ported from cpp/test/post_box_matchers_test.cc (Apache-2.0, Google Inc.).

import { describe, expect, it } from "vitest";
import { getPostBoxMatchers } from "./post-box-matchers.js";
import { createEmptyRule } from "./rule.js";

describe("getPostBoxMatchers", () => {
  it("always includes a matcher for 'und' (AlwaysGetMatcherForLanguageUnd)", () => {
    expect(getPostBoxMatchers(createEmptyRule())).toHaveLength(1);
  });

  it("ignores an invalid language (NoMatcherForInvalidLanguage)", () => {
    expect(getPostBoxMatchers({ languages: ["xx"] })).toHaveLength(1);
  });

  it("adds a matcher for a valid language (HasMatcherForValidLanguage)", () => {
    expect(getPostBoxMatchers({ languages: ["sv"] })).toHaveLength(2);
  });

  it("mixes valid and invalid languages (MixValidAndInvalidLanguage)", () => {
    expect(getPostBoxMatchers({ languages: ["xx", "sv"] })).toHaveLength(2);
  });

  it("uses the base language for matching (UseBaseLanguageForMatching)", () => {
    expect(getPostBoxMatchers({ languages: ["sv-SE"] })).toHaveLength(2);
  });

  it("parses language tags leniently (LenientLanguageTagParsing)", () => {
    expect(getPostBoxMatchers({ languages: ["SV_SE"] })).toHaveLength(2);
  });
});
