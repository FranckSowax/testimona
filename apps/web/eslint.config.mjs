import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import { LEGACY_DIRECT_DB, LEGACY_MAX_LINES, LEGACY_SERVICE_ROLE } from './eslint.legacy.mjs';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

// Seuls endroits autorisés à contourner la RLS (webhooks, back-office, jobs).
const PRIVILEGED = ['src/server/privileged/**', 'src/lib/supabase/admin.ts'];

// Seuls endroits autorisés à interroger la base directement.
const DATA_ACCESS = ['src/**/repo.ts', 'src/server/**'];

/**
 * Règles de garde du lot 0.
 *
 * WHY: les listes LEGACY_* gèlent la dette existante. Tout NOUVEAU fichier doit
 * respecter les règles ; un fichier ancien sort de la liste dès qu'il est
 * migré. Ne jamais ajouter de fichier à ces listes.
 */
export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'e2e/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/supabase/admin'],
              message:
                'Le client service-role contourne la RLS : réservé à src/server/privileged/. Utilisez le client utilisateur.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.type='MemberExpression'][callee.property.name='from'][arguments.0.type='Literal']",
          message:
            'Accès direct à la base interdit ici : passez par le repo.ts du module (src/modules/<domaine>/repo.ts).',
        },
      ],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  { files: PRIVILEGED, rules: { 'no-restricted-imports': 'off' } },
  { files: DATA_ACCESS, rules: { 'no-restricted-syntax': 'off' } },
  { files: ['src/**/*.test.{ts,tsx}'], rules: { 'no-restricted-imports': 'off' } },
  ...(LEGACY_SERVICE_ROLE.length
    ? [{ files: LEGACY_SERVICE_ROLE, rules: { 'no-restricted-imports': 'off' } }]
    : []),
  ...(LEGACY_DIRECT_DB.length
    ? [{ files: LEGACY_DIRECT_DB, rules: { 'no-restricted-syntax': 'off' } }]
    : []),
  ...(LEGACY_MAX_LINES.length ? [{ files: LEGACY_MAX_LINES, rules: { 'max-lines': 'off' } }] : []),
];
