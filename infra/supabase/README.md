# Supabase infra

Bootstrap and ongoing migration scripts for the Testimona Supabase project.

## Layout

```
supabase/
  README.md         # this file
  rls/
    policies.sql    # Row Level Security policies for all tables
  migrations/       # snapshot of Prisma migrations applied to Supabase
```

## Bootstrap a new Supabase project (per environment)

1. Create a project on https://supabase.com (region eu-central-1).
2. Note `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` from Project Settings → API.
3. Set `DATABASE_URL` to the connection-pooler URL (port `:6543` for serverless, `:5432` for migrations).
4. Apply Prisma schema:
   ```bash
   cd apps/api  # or /api during transition
   DATABASE_URL=$SUPABASE_DEV_DB pnpm prisma migrate deploy
   ```
5. Apply RLS policies:
   ```bash
   psql $SUPABASE_DEV_DB -f infra/supabase/rls/policies.sql
   ```
6. Configure Auth providers (Dashboard → Authentication → Providers):
   - Email/Password: enable, confirm email required
   - Google OAuth: paste `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
7. Configure Auth redirect URLs:
   - `https://app.testimona.com/auth/callback`
   - `http://localhost:3000/auth/callback` (dev)
8. Customize email templates (signup, recovery, magic link) in Dashboard → Authentication → Email Templates.

## Data migration from current Postgres → Supabase (Phase 2 of plan)

1. Schema first (no data) — run `prisma migrate deploy` against an empty Supabase project.
2. Dump current prod data:
   ```bash
   pg_dump --no-owner --no-acl --data-only --inserts $CURRENT_PROD_DB > dump.sql
   ```
3. Restore to Supabase:
   ```bash
   psql $SUPABASE_PROD_DB -f dump.sql
   ```
4. Verify counts match (5 critical tables minimum):
   ```sql
   select 'User' as t, count(*) from "User"
   union all select 'Memorial', count(*) from "Memorial"
   union all select 'Testimonial', count(*) from "Testimonial"
   union all select 'Photo', count(*) from "Photo"
   union all select 'Donation', count(*) from "Donation";
   ```
5. Apply RLS (only after data load, otherwise inserts may fail).
