-- ============================================================================
-- Testimona — Supabase Row Level Security policies
-- ============================================================================
-- Apply with: psql $SUPABASE_DEV_DB -f infra/supabase/rls/policies.sql
-- Or via Supabase Dashboard SQL editor.
--
-- Conventions:
--  - service_role bypasses RLS (used only by api/ BFF — never exposed)
--  - anon key has read-only access to PUBLIC memorials and their content
--  - authenticated users can manage their own resources
-- ============================================================================

-- helper: is_admin() reads role from JWT app_metadata
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin',
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- "Memorial" table
-- ---------------------------------------------------------------------------
alter table "Memorial" enable row level security;

drop policy if exists "memorial_select_public_or_owner" on "Memorial";
create policy "memorial_select_public_or_owner" on "Memorial"
  for select
  using (
    "isPublic" = true
    or auth.uid()::text = "ownerId"::text
    or public.is_admin()
  );

drop policy if exists "memorial_insert_authenticated" on "Memorial";
create policy "memorial_insert_authenticated" on "Memorial"
  for insert
  with check (auth.uid()::text = "ownerId"::text);

drop policy if exists "memorial_update_owner" on "Memorial";
create policy "memorial_update_owner" on "Memorial"
  for update
  using (auth.uid()::text = "ownerId"::text or public.is_admin())
  with check (auth.uid()::text = "ownerId"::text or public.is_admin());

drop policy if exists "memorial_delete_owner" on "Memorial";
create policy "memorial_delete_owner" on "Memorial"
  for delete
  using (auth.uid()::text = "ownerId"::text or public.is_admin());

-- ---------------------------------------------------------------------------
-- "Testimonial" table
-- ---------------------------------------------------------------------------
alter table "Testimonial" enable row level security;

drop policy if exists "testimonial_select_public" on "Testimonial";
create policy "testimonial_select_public" on "Testimonial"
  for select
  using (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "testimonial_insert_authenticated" on "Testimonial";
create policy "testimonial_insert_authenticated" on "Testimonial"
  for insert
  with check (auth.uid() is not null);

drop policy if exists "testimonial_update_author_or_admin" on "Testimonial";
create policy "testimonial_update_author_or_admin" on "Testimonial"
  for update
  using (auth.uid()::text = "authorId"::text or public.is_admin())
  with check (auth.uid()::text = "authorId"::text or public.is_admin());

drop policy if exists "testimonial_delete_author_or_admin" on "Testimonial";
create policy "testimonial_delete_author_or_admin" on "Testimonial"
  for delete
  using (auth.uid()::text = "authorId"::text or public.is_admin());

-- ---------------------------------------------------------------------------
-- "TestimonialLike" — public read on public memorials, self-managed
-- ---------------------------------------------------------------------------
alter table "TestimonialLike" enable row level security;

drop policy if exists "testimonial_like_select_public" on "TestimonialLike";
create policy "testimonial_like_select_public" on "TestimonialLike"
  for select
  using (
    exists (
      select 1 from "Testimonial" t
      join "Memorial" m on m.id = t."memorialId"
      where t.id = "TestimonialLike"."testimonialId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "testimonial_like_insert_self" on "TestimonialLike";
create policy "testimonial_like_insert_self" on "TestimonialLike"
  for insert
  with check (auth.uid()::text = "userId"::text);

drop policy if exists "testimonial_like_delete_self" on "TestimonialLike";
create policy "testimonial_like_delete_self" on "TestimonialLike"
  for delete
  using (auth.uid()::text = "userId"::text or public.is_admin());

-- ---------------------------------------------------------------------------
-- "TestimonialComment" — public read on public memorials, mutate by author
-- ---------------------------------------------------------------------------
alter table "TestimonialComment" enable row level security;

drop policy if exists "testimonial_comment_select_public" on "TestimonialComment";
create policy "testimonial_comment_select_public" on "TestimonialComment"
  for select
  using (
    exists (
      select 1 from "Testimonial" t
      join "Memorial" m on m.id = t."memorialId"
      where t.id = "TestimonialComment"."testimonialId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "testimonial_comment_insert_authenticated" on "TestimonialComment";
create policy "testimonial_comment_insert_authenticated" on "TestimonialComment"
  for insert
  with check (auth.uid() is not null and auth.uid()::text = "authorId"::text);

drop policy if exists "testimonial_comment_update_author_or_admin" on "TestimonialComment";
create policy "testimonial_comment_update_author_or_admin" on "TestimonialComment"
  for update
  using (auth.uid()::text = "authorId"::text or public.is_admin())
  with check (auth.uid()::text = "authorId"::text or public.is_admin());

drop policy if exists "testimonial_comment_delete_author_or_admin" on "TestimonialComment";
create policy "testimonial_comment_delete_author_or_admin" on "TestimonialComment"
  for delete
  using (auth.uid()::text = "authorId"::text or public.is_admin());

-- ---------------------------------------------------------------------------
-- "TestimonialReport" — write-only by reporter, read by admin or self
-- ---------------------------------------------------------------------------
alter table "TestimonialReport" enable row level security;

drop policy if exists "testimonial_report_insert_authenticated" on "TestimonialReport";
create policy "testimonial_report_insert_authenticated" on "TestimonialReport"
  for insert
  with check (auth.uid() is not null and auth.uid()::text = "reporterId"::text);

drop policy if exists "testimonial_report_select_admin_or_self" on "TestimonialReport";
create policy "testimonial_report_select_admin_or_self" on "TestimonialReport"
  for select
  using (auth.uid()::text = "reporterId"::text or public.is_admin());

-- ---------------------------------------------------------------------------
-- "Photo" table
-- ---------------------------------------------------------------------------
alter table "Photo" enable row level security;

drop policy if exists "photo_select_public" on "Photo";
create policy "photo_select_public" on "Photo"
  for select
  using (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "photo_mutate_owner_or_admin" on "Photo";
create policy "photo_mutate_owner_or_admin" on "Photo"
  for all
  using (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- "Biography" + "Chapter"
-- ---------------------------------------------------------------------------
alter table "Biography" enable row level security;
alter table "Chapter" enable row level security;

drop policy if exists "biography_select_public" on "Biography";
create policy "biography_select_public" on "Biography"
  for select
  using (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "biography_mutate_owner" on "Biography";
create policy "biography_mutate_owner" on "Biography"
  for all
  using (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  );

drop policy if exists "chapter_select_public" on "Chapter";
create policy "chapter_select_public" on "Chapter"
  for select
  using (
    exists (
      select 1 from "Biography" b
      join "Memorial" m on m.id = b."memorialId"
      where b.id = "Chapter"."biographyId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "chapter_mutate_owner" on "Chapter";
create policy "chapter_mutate_owner" on "Chapter"
  for all
  using (
    exists (
      select 1 from "Biography" b
      join "Memorial" m on m.id = b."memorialId"
      where b.id = "Chapter"."biographyId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from "Biography" b
      join "Memorial" m on m.id = b."memorialId"
      where b.id = "Chapter"."biographyId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- "Donation" — strict: never expose donor data to anon; service_role for BFF.
-- ---------------------------------------------------------------------------
alter table "Donation" enable row level security;

drop policy if exists "donation_select_donor_or_admin" on "Donation";
create policy "donation_select_donor_or_admin" on "Donation"
  for select
  using (auth.uid()::text = "donorId"::text or public.is_admin());

-- INSERT/UPDATE reserved to service_role (Stripe webhooks via api/ BFF).

-- ---------------------------------------------------------------------------
-- "Funeral" + "FuneralEvent"
-- ---------------------------------------------------------------------------
alter table "Funeral" enable row level security;
alter table "FuneralEvent" enable row level security;

drop policy if exists "funeral_select_public" on "Funeral";
create policy "funeral_select_public" on "Funeral"
  for select
  using (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "funeral_mutate_owner" on "Funeral";
create policy "funeral_mutate_owner" on "Funeral"
  for all
  using (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from "Memorial" m
      where m.id = "memorialId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  );

drop policy if exists "funeralevent_select_public" on "FuneralEvent";
create policy "funeralevent_select_public" on "FuneralEvent"
  for select
  using (
    exists (
      select 1 from "Funeral" f
      join "Memorial" m on m.id = f."memorialId"
      where f.id = "FuneralEvent"."funeralId"
        and (m."isPublic" = true or auth.uid()::text = m."ownerId"::text)
    )
    or public.is_admin()
  );

drop policy if exists "funeralevent_mutate_owner" on "FuneralEvent";
create policy "funeralevent_mutate_owner" on "FuneralEvent"
  for all
  using (
    exists (
      select 1 from "Funeral" f
      join "Memorial" m on m.id = f."memorialId"
      where f.id = "FuneralEvent"."funeralId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from "Funeral" f
      join "Memorial" m on m.id = f."memorialId"
      where f.id = "FuneralEvent"."funeralId" and auth.uid()::text = m."ownerId"::text
    )
    or public.is_admin()
  );
