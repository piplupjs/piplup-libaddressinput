// Shared between server and client: given a PreloadSupplier that already
// has `initialRegion` loaded (however it got that way — a real fetch on
// the server, or PreloadSupplier.from() on the client), renders the same
// UI. No fetch happens inside this component.

import { useMemo } from "react";
import { buildLayout, type LayoutField, type PreloadSupplier } from "@piplup/libaddressinput";
import { en } from "@piplup/libaddressinput/messages/en";

export interface AppProps {
  supplier: PreloadSupplier;
  initialRegion: string;
}

function labelText(field: LayoutField): string {
  if (field.labelId === "CEDEX") return "CEDEX";
  if (field.labelId === undefined) return field.field;
  return en[field.labelId];
}

export function App({ initialRegion }: AppProps) {
  const layout = useMemo(() => buildLayout(initialRegion, "en"), [initialRegion]);

  return (
    <main style={{ maxWidth: "32rem", margin: "2rem auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Address form (react-ssr)</h1>
      <p>
        Region <strong>{initialRegion}</strong>'s address data was loaded once, on the
        server, and hydrated here with no second fetch — open the network tab.
      </p>
      {layout.rows.flat().map((item) =>
        item.kind === "field" ? (
          <label key={item.field} style={{ display: "block", marginTop: "0.75rem" }}>
            {labelText(item)}
            {item.required ? " *" : ""}
            <input
              type="text"
              style={{ display: "block", width: "100%", boxSizing: "border-box" }}
            />
          </label>
        ) : null,
      )}
    </main>
  );
}
