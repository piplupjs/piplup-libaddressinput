import { useMemo } from "react";
import { getRegionOptions } from "@piplup/libaddressinput";
import type { CountriesOptions, Country } from "./types.js";

export function useCountries(opts?: CountriesOptions): Country[] {
  const locale = opts?.locale ?? "en";
  const priority = opts?.priority;

  return useMemo(() => {
    const list = getRegionOptions(locale);
    if (!priority || priority.length === 0) {
      return list;
    }

    const prioritySet = new Set(priority);
    const byCode = new Map(list.map((c) => [c.code, c]));

    const prioritized: Country[] = [];
    for (const code of priority) {
      const match = byCode.get(code);
      if (match) prioritized.push(match);
    }

    const remaining = list.filter((c) => !prioritySet.has(c.code));
    return [...prioritized, ...remaining];
  }, [locale, priority?.join(",")]);
}
