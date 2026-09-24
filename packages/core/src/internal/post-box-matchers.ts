// Port of cpp/src/post_box_matchers.h / .cc (Apache-2.0, Google Inc.).
//
// P.O. box regular expressions per language. RE2's inline `(?i)` case-
// insensitive prefix is translated to JS's `i` flag instead (JS `RegExp`
// doesn't support inline `(?i)`); the patterns themselves are copied
// verbatim, including the Cyrillic "ru" one exactly as upstream wrote it.

import { parseLanguage } from "./language.js";
import type { Rule } from "./rule.js";

interface LanguagePattern {
  pattern: string;
  caseInsensitive: boolean;
}

// Mirrors kLanguageInfoMap verbatim (order doesn't matter here; upstream's
// sorted-array/binary-search is just an implementation detail of a C++
// lookup table).
const LANGUAGE_PATTERNS: Record<string, LanguagePattern> = {
  ar: { pattern: "صندوق بريد|ص[-. ]ب", caseInsensitive: false },
  cs: { pattern: "p\\.? ?p\\.? \\d", caseInsensitive: true },
  da: { pattern: "Postboks", caseInsensitive: true },
  de: { pattern: "Postfach", caseInsensitive: true },
  el: { pattern: "T\\.? ?Θ\\.? \\d{2}", caseInsensitive: true },
  en: { pattern: "Private Bag|Post(?:al)? Box", caseInsensitive: false },
  es: { pattern: "(?:Apartado|Casillas) de correos?", caseInsensitive: true },
  fi: { pattern: "Postilokero|P\\.?L\\.? \\d", caseInsensitive: true },
  fr: {
    pattern: "Bo(?:[iî]|î)te Postale|BP \\d|CEDEX \\d",
    caseInsensitive: true,
  },
  hr: { pattern: "p\\.? ?p\\.? \\d", caseInsensitive: true },
  hu: { pattern: "Postafi(?:[oó]|ó)k|Pf\\.? \\d", caseInsensitive: true },
  ja: { pattern: "私書箱\\d{1,5}号", caseInsensitive: false },
  nl: { pattern: "Postbus", caseInsensitive: true },
  no: { pattern: "Postboks", caseInsensitive: true },
  pl: { pattern: "Skr(?:\\.?|ytka) poczt(?:\\.?|owa)", caseInsensitive: true },
  pt: { pattern: "Apartado", caseInsensitive: true },
  ru: {
    pattern: 'абонентский ящик|[аa]"я (?:(?:№|#|N) ?)?\\d',
    caseInsensitive: true,
  },
  sv: { pattern: "Box \\d", caseInsensitive: true },
  und: { pattern: "P\\.? ?O\\.? Box", caseInsensitive: false },
  zh: { pattern: "郵政信箱.{1,5}號|郵局第.{1,10}號信箱", caseInsensitive: false },
};

const compiledCache = new Map<string, RegExp>();

function getCompiledMatcher(languageTag: string): RegExp | undefined {
  const cached = compiledCache.get(languageTag);
  if (cached !== undefined) return cached;
  const info = LANGUAGE_PATTERNS[languageTag];
  if (info === undefined) return undefined;
  const matcher = new RegExp(info.pattern, info.caseInsensitive ? "i" : "");
  compiledCache.set(languageTag, matcher);
  return matcher;
}

/**
 * Returns the P.O.-box matchers relevant for a country rule: always
 * `"und"` (English-like defaults) plus one per base language the country's
 * rule declares. Mirrors `PostBoxMatchers::GetMatchers`.
 */
export function getPostBoxMatchers(countryRule: Pick<Rule, "languages">): RegExp[] {
  const languageTags = [
    "und",
    ...countryRule.languages.map((tag) => parseLanguage(tag).base),
  ];
  const matchers: RegExp[] = [];
  for (const tag of languageTags) {
    const matcher = getCompiledMatcher(tag);
    if (matcher !== undefined) {
      matchers.push(matcher);
    }
  }
  return matchers;
}
