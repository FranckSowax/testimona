import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // WHY: chaque fichier de test démarre un Postgres embarqué (PGlite) et rejoue
    // toutes les migrations ; quelques secondes par instance.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
