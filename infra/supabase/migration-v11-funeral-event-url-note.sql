-- V11 — Funeral event: persist the optional URL and Note fields already
-- present in the "Create event" popup but previously dropped on submit
-- (recette PDF 2026-06-07 p39 "URL et la Note n'apparaissent pas").
-- Both columns are nullable → zero-downtime, no backfill required.

alter table "FuneralEvent"
  add column if not exists url text,
  add column if not exists note text;
