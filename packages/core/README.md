# @piplup/libaddressinput

[![npm version](https://img.shields.io/npm/v/@piplup/libaddressinput)](https://www.npmjs.com/package/@piplup/libaddressinput)
[![npm downloads](https://img.shields.io/npm/dm/@piplup/libaddressinput)](https://www.npmjs.com/package/@piplup/libaddressinput)
[![license](https://img.shields.io/npm/l/@piplup/libaddressinput)](https://github.com/piplup/libaddressinput/blob/master/LICENSE)

A headless, dependency-free TypeScript port of Google's [libaddressinput](https://github.com/google/libaddressinput).

International postal address **formatting**, **validation**, **normalization**, and **form-layout data** for 200+ regions, with no rendering and no framework dependency.

## Features

✅ **200+ regions** - Format rules for most countries/territories  
✅ **Address validation** - Postal code, administrative area, locality matching  
✅ **Address normalization** - Convert abbreviations to canonical forms (CA → California)  
✅ **Form layout data** - Field order, requirements, labels per region  
✅ **Headless** - Returns plain data, zero rendering  
✅ **Zero dependencies** - ~30KB minified+gzip  
✅ **TypeScript** - Full type safety, no `any`  
✅ **Multiple exports** - Tree-shake what you need  
✅ **Tested** - Against Google's own test cases

## Installation

```bash
npm install @piplup/libaddressinput
```

```bash
pnpm add @piplup/libaddressinput
```

```bash
yarn add @piplup/libaddressinput
```

## Quick Start

### Validate an address

```typescript
import {
  validate,
  PreloadSupplier,
  FetchSource,
  MemoryStorage,
} from "@piplup/libaddressinput";

const supplier = new PreloadSupplier(new FetchSource(), new MemoryStorage());

const address = {
  regionCode: "US",
  addressLine: ["1600 Amphitheatre Pkwy"],
  locality: "Mountain View",
  administrativeArea: "CA",
  postalCode: "94043",
  recipient: "Jane Doe",
};

const problems = await validate(supplier, address);
// [] (valid) or [{ field: 'POSTAL_CODE', problem: 'MISMATCHING_VALUE' }]
```

### Format an address

```typescript
import { formatAddress, normalize } from "@piplup/libaddressinput";

const formatted = formatAddress(normalize(supplier, address));
// ['Jane Doe', '1600 Amphitheatre Pkwy', 'Mountain View, CA 94043']
```

### Build a form layout

```typescript
import { buildLayout, getRegionOptions } from "@piplup/libaddressinput";

// Get all regions for a country selector
const regions = getRegionOptions("en");
// [{ code: 'US', name: 'United States' }, ...]

// Get form fields for a region
const layout = buildLayout("US", "en");
// {
//   rows: [
//     [{ field: 'RECIPIENT', required: true, ... }],
//     [{ field: 'ADMIN_AREA', ... }, { field: 'POSTAL_CODE', ... }],
//     ...
//   ]
// }

// Render layout however you like
for (const row of layout.rows) {
  for (const field of row) {
    if (field.kind === "field") {
      console.log(`${field.field}: required=${field.required}`);
    }
  }
}
```

### Headless form controller

For a complete form that manages state, validation, and region changes:

```typescript
import { createAddressForm } from "@piplup/libaddressinput";

const form = createAddressForm({ supplier });

// Subscribe to state changes
form.subscribe((state) => {
  console.log("Form state:", state);
  // { values, layout, regionTree, problems, loading, ... }
});

// Set a region (loads data, builds layout, resets state)
await form.setRegion("US");

// Set field values
form.setField("locality", "Mountain View");
form.setField("ADMIN_AREA", "California"); // Also accepts AddressField enums

// Validate (returns user-actionable problems)
const problems = await form.validate();

// Normalize values (e.g., 'California' → 'CA')
form.normalizeValues();

// Reset to initial state
form.reset();

// Cleanup when done (clears timers, listeners)
form.dispose();
```

## Exports

The core package exports sub-entry points for tree-shaking:

```typescript
// Main export - everything
import { validate, formatAddress, buildLayout } from "@piplup/libaddressinput";

// Individual exports for smaller bundles
import { validate } from "@piplup/libaddressinput/validate";
import { formatAddress } from "@piplup/libaddressinput/format";
import { buildLayout } from "@piplup/libaddressinput/layout";
import { createAddressForm } from "@piplup/libaddressinput/form";
import { getRegionOptions } from "@piplup/libaddressinput/ui";
```

## Data Sources

The library needs address data for a region before validation/formatting. Choose a data source:

### FetchSource (Recommended for browsers)

Fetches data from Google's public endpoint on-demand.

```typescript
import { FetchSource } from "@piplup/libaddressinput";

const source = new FetchSource();
// Fetches from: https://chromium-i18n.appspot.com/ssl-address/data/...
```

### FallbackAggregateSource (Recommended for Node.js / tests)

Uses bundled fallback data for common regions, falls back to fetch for others.

```typescript
import { FallbackAggregateSource } from "@piplup/libaddressinput";

const source = new FallbackAggregateSource();
```

### OndemandSupplier (For streaming/pipes)

Streams data from a source without caching.

```typescript
import { OndemandSupplier } from "@piplup/libaddressinput";

const supplier = new OndemandSupplier(source);
// No caching - fetches on every request
```

## Regional Data

Data is fetched/loaded lazily. Call `supplier.loadRules()` to pre-load:

```typescript
// Load a single region
await supplier.loadRules("US");

// Check if loaded
const isLoaded = supplier.isLoaded("US");

// Export loaded data (for server-side hydration)
const data = supplier.export();
// Pass to PreloadSupplier.from() on client:
const hydrated = PreloadSupplier.from(source, storage, data);
```

## API Reference

### Validation

- `validate(supplier, address, options?)` - Validate an address
- `ValidationProblem` - { field, problem } tuple

### Formatting

- `formatAddress(address)` - Format as multi-line array
- `formatAddressAsSingleLine(address)` - Format as single string
- `getStreetAddressLinesAsSingleLine(address)` - Format street address

### Normalization

- `normalize(supplier, address)` - Canonicalize field values

### Layout & Metadata

- `buildLayout(regionCode, locale?, options?)` - Get form field layout
- `getFieldLabel(field, options?)` - Get localized label
- `getProblemMessage(problem, options?)` - Get error message
- `getRegionOptions(locale?)` - Get region list for selectors
- `getRegionCodes()` - Get all supported region codes

### Form Controller

- `createAddressForm(options)` - Create a managed form instance
- `AddressFormController` - State management interface

### Data Management

- `PreloadSupplier` - Load and cache region data
- `OndemandSupplier` - Stream data without caching
- `FetchSource` - Fetch from Google's endpoint
- `FallbackAggregateSource` - Bundled + fetch fallback
- `MemoryStorage` - In-memory cache
- `NullStorage` - No caching

## Browser Support

- Modern browsers (ES2020+)
- Node.js 18+
- Bun, Deno (module format)

## Performance

- **Bundle size**: ~30KB minified+gzip (core only)
- **Time to validate**: <1ms (cached data)
- **Initial load**: ~50-500ms (fetch region data, depends on network)
- **Memory**: ~50-500KB per region (depends on number of sub-regions)

## Examples

See [`examples/`](../../examples) for:

- [`node-cli`](../../examples/node-cli) - Command-line tool
- [`vanilla-dom`](../../examples/vanilla-dom) - Plain HTML/JS
- [`react-basic`](../../examples/react-basic) - React with useState
- [`react-form-controller`](../../examples/react-form-controller) - Advanced form state

## TypeScript

Full TypeScript support with no `@ts-ignore` needed:

```typescript
import type {
  AddressData,
  ValidationProblem,
  AddressLayout,
  RegionData,
} from "@piplup/libaddressinput";

const problems: ValidationProblem[] = await validate(supplier, address);
const layout: AddressLayout = buildLayout("US");
```

## Contributing

Contributions welcome! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## Testing

```bash
pnpm test
pnpm test:watch
```

## Related

- [@piplup/libaddressinput-react](../react) - React hooks and context
- [Google's libaddressinput](https://github.com/google/libaddressinput) - Original library
- [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) - Similar pattern for internationalization

## License

Apache-2.0. See [LICENSE](../../LICENSE) and [NOTICE](../../NOTICE).

This project ports code from Google's libaddressinput (Apache-2.0). See [DIVERGENCES.md](../../DIVERGENCES.md) for differences.
