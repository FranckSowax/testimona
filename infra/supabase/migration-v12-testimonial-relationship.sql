-- V12 — Store the author's family relationship to the deceased so it can be
-- shown after the name in testimonial bubbles (recette PDF 2026-06-07 p9/p11/p22
-- "mettre le lien de famille après une virgule suite au nom de l'utilisateur").
-- Nullable text → zero-downtime, no backfill required.

alter table "Testimonial"
  add column if not exists relationship text;
