import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    format: "src/formatter.ts",
    validate: "src/validator.ts",
    layout: "src/layout.ts",
    form: "src/form/controller.ts",
    ui: "src/ui/index.ts",
    "messages/en": "src/messages/en.ts",
    "labels/en": "src/labels/en.ts",
  },
  format: ["esm", "cjs"],
  dts: { resolve: false },
  tsconfig: "tsconfig.build.json",
  sourcemap: true,
  clean: true,
  splitting: true,
  target: "es2020",
  platform: "neutral",
});
