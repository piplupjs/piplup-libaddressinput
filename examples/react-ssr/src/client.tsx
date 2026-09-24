// Client hydration: rebuild the supplier from what the server embedded in
// the page — PreloadSupplier.from() does no network I/O for regions
// already in `exported`, so there's no request duplicating the server's
// fetch. A real `fetch`/`storage` is still passed in for any FURTHER
// regions the user picks later (e.g. switching the region dropdown, not
// shown in this minimal example).

import { hydrateRoot } from "react-dom/client";
import { FetchSource, MemoryStorage, PreloadSupplier } from "@piplup/libaddressinput";
import { App } from "./App.js";

declare global {
  interface Window {
    __ADDRESS_DATA__: { region: string; exported: Record<string, string> };
  }
}

const { region, exported } = window.__ADDRESS_DATA__;
const supplier = PreloadSupplier.from(new FetchSource(), new MemoryStorage(), exported);

hydrateRoot(
  document.getElementById("root")!,
  <App supplier={supplier} initialRegion={region} />,
);
