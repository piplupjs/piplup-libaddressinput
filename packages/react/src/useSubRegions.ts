import * as React from 'react';

import { findSubRegions, formatRegionOption } from '@piplup/libaddressinput';

import { AddressContext } from './context.js';

import type { SubRegion, SubRegionsOptions } from './types.js';
import type { AddressField } from '@piplup/libaddressinput';

export function useSubRegions(field: AddressField | string, opts?: SubRegionsOptions): SubRegion[] {
  const context = React.useContext(AddressContext);
  const state = opts?.state ?? context;

  if (!state) {
    throw new Error(
      'useSubRegions must be used within an AddressProvider or supplied with an explicit state option',
    );
  }

  const { tree } = state;
  const parentKey = opts?.parentKey;

  return React.useMemo(() => {
    if (!tree) {
      return [];
    }

    const isTopLevel =
      field === 'ADMIN_AREA' || field === 'administrativeArea' || (!parentKey && !field);

    if (isTopLevel && !parentKey) {
      return tree.subRegions.map((sub) => ({
        key: sub.key,
        label: formatRegionOption(sub),
        name: sub.name,
      }));
    }

    const subs = findSubRegions(tree, parentKey);
    return subs.map((sub) => ({
      key: sub.key,
      label: formatRegionOption(sub),
      name: sub.name,
    }));
  }, [tree, field, parentKey]);
}
