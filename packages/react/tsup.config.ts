import { defineConfig } from 'tsup';

export default defineConfig({
  banner: {
    js: '"use client";',
  },
  clean: true,
  dts: { resolve: false },
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'neutral',
  sourcemap: true,
  target: 'es2020',
  tsconfig: 'tsconfig.build.json',
});
