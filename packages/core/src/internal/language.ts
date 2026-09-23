// Port of cpp/src/language.h / language.cc (Apache-2.0, Google Inc.).
//
// A parsed BCP 47 language tag, plus upstream's logic for picking the best
// language/script to render an address's format in (used by lookup-key.ts
// for the LookupKey language suffix and by layout.ts in Phase 6).

import type { Rule } from "./rule.js";

export interface Language {
  /** The tag with "_" replaced by "-", e.g. "zh-Latn-CN". */
  tag: string;
  /** The base subtag, lowercased, e.g. "zh". */
  base: string;
  /** True if the tag's 2nd or 3rd subtag is (case-insensitively) "Latn". */
  hasLatinScript: boolean;
}

const LATIN_SCRIPT_SUBTAG = "latn";

export function parseLanguage(languageTag: string): Language {
  const tag = languageTag.replace(/_/g, "-");
  const lowercase = tag.toLowerCase();
  const subtags = lowercase.length === 0 ? [] : lowercase.split("-");
  const base = subtags[0] ?? "";
  // Only the second and third subtag positions are supported for script,
  // matching upstream.
  const hasLatinScript =
    subtags[1] === LATIN_SCRIPT_SUBTAG || subtags[2] === LATIN_SCRIPT_SUBTAG;
  return { tag, base, hasLatinScript };
}

/**
 * Picks the best of a region's supported languages for `uiLanguage`,
 * mirroring `ChooseBestAddressLanguage`. Falls back to `uiLanguage` itself
 * when the rule declares no languages, and to a synthesized "<base>-Latn"
 * tag when a Latin-script rendering is needed but the rule's data doesn't
 * list one explicitly.
 */
export function chooseBestAddressLanguage(
  addressRegionRule: Pick<Rule, "languages" | "latinFormat">,
  uiLanguage: Language,
): Language {
  if (addressRegionRule.languages.length === 0) {
    return uiLanguage;
  }

  const availableLanguages = addressRegionRule.languages.map(parseLanguage);

  if (uiLanguage.tag.length === 0) {
    return availableLanguages[0]!;
  }

  const hasLatinFormat = addressRegionRule.latinFormat.length > 0;
  const latinScriptLanguage = parseLanguage(`${availableLanguages[0]!.base}-Latn`);

  if (hasLatinFormat && uiLanguage.hasLatinScript) {
    return latinScriptLanguage;
  }

  for (const language of availableLanguages) {
    // Base-language comparison works because no region supports the same
    // base language with different scripts (matches upstream's comment).
    if (uiLanguage.base === language.base) {
      return language;
    }
  }

  return hasLatinFormat ? latinScriptLanguage : availableLanguages[0]!;
}
