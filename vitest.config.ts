import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: ['**/*.test.ts', '**/dist/**'],
      include: ['packages/*/src/**'],
      provider: 'v8',
    },
    environment: 'node',
    environmentMatchGlobs: [['packages/react/**', 'happy-dom']],
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.test.tsx',
      'packages/*/test/**/*.test.ts',
    ],
  },
});
