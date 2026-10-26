import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // WHY: e2e/ contient des specs Playwright, lancées par `pnpm test:e2e`.
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
