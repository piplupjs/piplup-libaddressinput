// Port of cpp/src/post_box_matchers.h / .cc (Apache-2.0, Google Inc.).
//
// P.O. box regular expressions per language. RE2's inline `(?i)` case-
// insensitive prefix is translated to JS's `i` flag instead (JS `RegExp`
// doesn't support inline `(?i)`); the patterns themselves are copied
// verbatim, including the Cyrillic "ru" one exactly as upstream wrote it.

import { parseLanguage } from './language.js';

import type { Rule } from './rule.js';

interface LanguagePattern {
  caseInsensitive: boolean;
  pattern: string;
}

// Mirrors kLanguageInfoMap verbatim (order doesn't matter here; upstream's
// sorted-array/binary-search is just an implementation detail of a C++
// lookup table).
const LANGUAGE_PATTERNS: Record<string, LanguagePattern> = {
  ar: { caseInsensitive: false, pattern: 'صندوق بريد|ص[-. ]ب' },
  cs: { caseInsensitive: true, pattern: 'p\\.? ?p\\.? \\d' },
  da: { caseInsensitive: true, pattern: 'Postboks' },
  de: { caseInsensitive: true, pattern: 'Postfach' },
  el: { caseInsensitive: true, pattern: 'T\\.? ?Θ\\.? \\d{2}' },
  en: { caseInsensitive: false, pattern: 'Private Bag|Post(?:al)? Box' },
  es: { caseInsensitive: true, pattern: '(?:Apartado|Casillas) de correos?' },
  fi: { caseInsensitive: true, pattern: 'Postilokero|P\\.?L\\.? \\d' },
  fr: {
    caseInsensitive: true,
    pattern: 'Bo(?:[iî]|î)te Postale|BP \\d|CEDEX \\d',
  },
  hr: { caseInsensitive: true, pattern: 'p\\.? ?p\\.? \\d' },
  hu: { caseInsensitive: true, pattern: 'Postafi(?:[oó]|ó)k|Pf\\.? \\d' },
  ja: { caseInsensitive: false, pattern: '私書箱\\d{1,5}号' },
  nl: { caseInsensitive: true, pattern: 'Postbus' },
  no: { caseInsensitive: true, pattern: 'Postboks' },
  pl: { caseInsensitive: true, pattern: 'Skr(?:\\.?|ytka) poczt(?:\\.?|owa)' },
  pt: { caseInsensitive: true, pattern: 'Apartado' },
  ru: {
    caseInsensitive: true,
    pattern: 'абонентский ящик|[аa]"я (?:(?:№|#|N) ?)?\\d',
  },
  sv: { caseInsensitive: true, pattern: 'Box \\d' },
  und: { caseInsensitive: false, pattern: 'P\\.? ?O\\.? Box' },
  zh: { caseInsensitive: false, pattern: '郵政信箱.{1,5}號|郵局第.{1,10}號信箱' },
};

const compiledCache = new Map<string, RegExp>();

function getCompiledMatcher(languageTag: string): RegExp | undefined {
  const cached = compiledCache.get(languageTag);
  if (cached !== undefined) {
    return cached;
  }
  const info = LANGUAGE_PATTERNS[languageTag];
  if (info === undefined) {
    return undefined;
  }
  const matcher = new RegExp(info.pattern, info.caseInsensitive ? 'i' : '');
  compiledCache.set(languageTag, matcher);
  return matcher;
}

/**
 * Returns the P.O.-box matchers relevant for a country rule: always
 * `"und"` (English-like defaults) plus one per base language the country's
 * rule declares. Mirrors `PostBoxMatchers::GetMatchers`.
 */
export function getPostBoxMatchers(countryRule: Pick<Rule, 'languages'>): RegExp[] {
  const languageTags = ['und', ...countryRule.languages.map((tag) => parseLanguage(tag).base)];
  const matchers: RegExp[] = [];
  for (const tag of languageTags) {
    const matcher = getCompiledMatcher(tag);
    if (matcher !== undefined) {
      matchers.push(matcher);
    }
  }
  return matchers;
}
