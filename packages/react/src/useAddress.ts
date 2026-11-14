import * as React from 'react';

import {
  buildLayout,
  buildRegionTree,
  DATA_KEY_TO_FIELD,
  formatRegionOption,
  getFieldAutocomplete,
  getFieldKey,
  getFieldLabel,
} from '@piplup/libaddressinput';

import type { AddressOptions, AddressState, FieldMeta, SubRegion } from './types.js';
import type {
  AddressData,
  AddressField,
  AddressLayout,
  PreloadSupplier,
  RegionData,
} from '@piplup/libaddressinput';

function buildFieldMetaRows(
  layout: AddressLayout | null,
  tree: null | RegionData,
  opts: {
    labels: AddressOptions['labels'] | undefined;
    messages: AddressOptions['messages'] | undefined;
  },
): FieldMeta[][] {
  if (!layout) {
    return [];
  }
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
      if (item.kind !== 'field') {
        continue;
      }
      const key = getFieldKey(item.field);
      const label = getFieldLabel(item, labelOpts);

      let options: SubRegion[] | undefined = undefined;
      if (item.field === 'ADMIN_AREA' && tree && tree.subRegions.length > 0) {
        options = tree.subRegions.map((sub) => ({
          key: sub.key,
          label: formatRegionOption(sub),
          name: sub.name,
        }));
      }

      rowFields.push({
        autoComplete: getFieldAutocomplete(item.field),
        field: item.field,
        isSelect: options !== undefined && options.length > 0,
        key,
        label,
        length: item.length,
        multiline: item.multiline,
        options,
        required: item.required,
      });
    }
    if (rowFields.length > 0) {
      rows.push(rowFields);
    }
  }

  return rows;
}

export function useAddress(opts: AddressOptions): AddressState {
  const { includeLiterals = false, labels, locale = 'en', messages, region, supplier } = opts;

  // Build initial layout synchronously if region is non-empty
  const initialLayout = React.useMemo(() => {
    if (!region) {
      return null;
    }
    return buildLayout(region, locale, { includeLiterals });
  }, [region, locale, includeLiterals]);

  const [tree, setTree] = React.useState<null | RegionData>(null);
  const [loading, setLoading] = React.useState(Boolean(region));
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!region) {
      // Resetting state when the region is cleared; there is nothing to load.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTree(null);
      setLoading(false);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const sup = supplier as unknown as Record<string, unknown>;
        if (typeof sup.loadRules === 'function') {
          const isLoaded =
            typeof sup.isLoaded === 'function'
              ? Boolean((sup.isLoaded as (code: string) => boolean)(region))
              : false;

          if (!isLoaded) {
            const res = await (sup.loadRules as (code: string) => Promise<{ success: boolean }>)(
              region,
            );
            if (!res.success && !cancelled) {
              setError(new Error(`Failed to load address rules for region "${region}"`));
              setLoading(false);
              return;
            }
          }
        }

        if (cancelled) {
          return;
        }

        let regionTree: null | RegionData = null;
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

  const rows = React.useMemo(() => {
    return buildFieldMetaRows(initialLayout, tree, { labels, messages });
  }, [initialLayout, tree, labels, messages]);

  const fields = React.useMemo(() => rows.flat(), [rows]);

  const getField = React.useMemo(() => {
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
    error,
    fields,
    getField,
    loading,
    region,
    rows,
    supplier,
    tree,
  };
}
