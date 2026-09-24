// A minimal server (Vite in middleware mode, so `src/App.tsx` runs
// unbundled during dev — no separate SSR build step needed for this demo).
// The point being demonstrated: address data is loaded ONCE, on the
// server, and handed to the client as inline JSON — the browser never
// fetches it again. See src/client.tsx for the hydration side.

import http from "node:http";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import {
  FetchSource,
  MemoryStorage,
  PreloadSupplier,
} from "@piplup/libaddressinput";
import { createServer as createViteServer } from "vite";
import { App } from "./src/App.js";

const INITIAL_REGION = "US";
const PORT = 5183;

async function main(): Promise<void> {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "custom" });

  const server = http.createServer((req, res) => {
    vite.middlewares(req, res, () => {
      void handle(req, res);
    });
  });

  async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.url !== "/" && req.url !== undefined && !req.url.startsWith("/?")) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    // Server-side load: this is the one and only network fetch for this
    // region's address data, for every client that requests this page.
    const supplier = new PreloadSupplier(new FetchSource(), new MemoryStorage());
    const loaded = await supplier.loadRules(INITIAL_REGION);
    if (!loaded.success) {
      res.statusCode = 502;
      res.end(`Failed to load address data for ${INITIAL_REGION}`);
      return;
    }
    const exported = supplier.export();

    const appHtml = renderToString(
      createElement(App, { supplier, initialRegion: INITIAL_REGION }),
    );

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>react-ssr example — @piplup/libaddressinput</title>
  </head>
  <body>
    <div id="root">${appHtml}</div>
    <script>window.__ADDRESS_DATA__ = ${JSON.stringify({ region: INITIAL_REGION, exported })};</script>
    <script type="module" src="/src/client.tsx"></script>
  </body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.end(await vite.transformIndexHtml(req.url ?? "/", html));
  }

  server.listen(PORT, () => {
    console.log(`react-ssr example listening on http://localhost:${PORT}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
