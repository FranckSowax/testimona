-- V13 — Social media accounts of the deceased on the Biography card
-- (recette PDF 2026-06-07 p35 "ajouter un champ pour les liens vers les
-- social media accounts du défunt"). Stored as free text, one URL per line.

alter table "Biography"
  add column if not exists "socialLinks" text;
