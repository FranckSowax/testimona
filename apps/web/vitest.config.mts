import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // WHY: tsconfig garde `jsx: preserve` pour Next ; les tests de composants (.tsx) ont besoin du
  // runtime JSX automatique de React 19, sans `import React` dans chaque fichier.
  esbuild: { jsx: 'automatic' },
  test: {
    // WHY: e2e/ contient des specs Playwright, lancées par `pnpm test:e2e`.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
