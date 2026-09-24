import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["esm", "cjs"],
  dts: { resolve: false },
  tsconfig: "tsconfig.build.json",
  sourcemap: true,
  clean: true,
  target: "es2020",
  platform: "neutral",
  banner: {
    js: '"use client";',
  },
});
