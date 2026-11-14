import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  dts: { resolve: false },
  entry: {
    form: 'src/form/controller.ts',
    format: 'src/formatter.ts',
    index: 'src/index.ts',
    'labels/en': 'src/labels/en.ts',
    layout: 'src/layout.ts',
    'messages/en': 'src/messages/en.ts',
    ui: 'src/ui/index.ts',
    validate: 'src/validator.ts',
  },
  format: ['esm', 'cjs'],
  platform: 'neutral',
  sourcemap: true,
  splitting: true,
  target: 'es2020',
  tsconfig: 'tsconfig.build.json',
});
