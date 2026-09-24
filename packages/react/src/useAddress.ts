import { useEffect, useMemo, useState } from "react";
import {
  buildLayout,
  buildRegionTree,
  DATA_KEY_TO_FIELD,
  formatRegionOption,
  getFieldAutocomplete,
  getFieldKey,
  getFieldLabel,
  type AddressData,
  type AddressField,
  type AddressLayout,
  type PreloadSupplier,
  type RegionData,
} from "@piplup/libaddressinput";
import type { AddressOptions, AddressState, FieldMeta, SubRegion } from "./types.js";

function buildFieldMetaRows(
  layout: AddressLayout | null,
  tree: RegionData | null,
  opts: AddressOptions,
): FieldMeta[][] {
  if (!layout) return [];
  const rows: FieldMeta[][] = [];

  const labelOpts =
    opts.labels || opts.messages
      ? {
          ...(opts.labels ? { labels: opts.labels } : {}),
          ...(opts.messages ? { messages: opts.messages } : {}),
        }
      : undefined;

  for (const row of layout.rows) {
    const rowFields: FieldMeta[] = [];
    for (const item of row) {
      if (item.kind !== "field") continue;
      const key = getFieldKey(item.field);
      const label = getFieldLabel(item, labelOpts);

      let options: SubRegion[] | undefined = undefined;
      if (item.field === "ADMIN_AREA" && tree && tree.subRegions.length > 0) {
        options = tree.subRegions.map((sub) => ({
          key: sub.key,
          name: sub.name,
          label: formatRegionOption(sub),
        }));
      }

      rowFields.push({
        field: item.field,
        key,
        label,
        required: item.required,
        autoComplete: getFieldAutocomplete(item.field),
        options,
        isSelect: options !== undefined && options.length > 0,
        multiline: item.multiline,
        length: item.length,
      });
    }
    if (rowFields.length > 0) {
      rows.push(rowFields);
    }
  }

  return rows;
}

export function useAddress(opts: AddressOptions): AddressState {
  const { supplier, region, locale = "en", includeLiterals = false } = opts;

  // Build initial layout synchronously if region is non-empty
  const initialLayout = useMemo(() => {
    if (!region) return null;
    return buildLayout(region, locale, { includeLiterals });
  }, [region, locale, includeLiterals]);

  const [tree, setTree] = useState<RegionData | null>(null);
  const [loading, setLoading] = useState(Boolean(region));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!region) {
      setTree(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const sup = supplier as unknown as Record<string, unknown>;
        if (typeof sup["loadRules"] === "function") {
          const isLoaded =
            typeof sup["isLoaded"] === "function"
              ? Boolean((sup["isLoaded"] as (code: string) => boolean)(region))
              : false;

          if (!isLoaded) {
            const res = await (sup["loadRules"] as (code: string) => Promise<{ success: boolean }>)(
              region,
            );
            if (!res.success && !cancelled) {
              setError(new Error(`Failed to load address rules for region "${region}"`));
              setLoading(false);
              return;
            }
          }
        }

        if (cancelled) return;

        let regionTree: RegionData | null = null;
        try {
          regionTree = buildRegionTree(supplier as PreloadSupplier, region, locale).tree;
        } catch {
          regionTree = null;
        }

        if (!cancelled) {
          setTree(regionTree);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [supplier, region, locale]);

  const rows = useMemo(() => {
    return buildFieldMetaRows(initialLayout, tree, opts);
  }, [initialLayout, tree, opts]);

  const fields = useMemo(() => rows.flat(), [rows]);

  const getField = useMemo(() => {
    return (field: AddressField | string): FieldMeta | undefined => {
      return fields.find(
        (f) =>
          f.field === field ||
          f.key === field ||
          f.field === DATA_KEY_TO_FIELD[field as keyof AddressData],
      );
    };
  }, [fields]);

  return {
    region,
    rows,
    fields,
    tree,
    loading,
    error,
    supplier,
    getField,
  };
}
