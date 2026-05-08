-- ============================================================================
-- Testimona — Seed SQL pour démo
-- ============================================================================
-- Exécution : Supabase Dashboard → SQL Editor → coller → Run
-- Préreq    : 1 user déjà inscrit sur la plateforme (récupère son UUID via
--             SQL : SELECT id, email FROM auth.users LIMIT 5;)
-- Idempotent: ON CONFLICT DO NOTHING — relance safe.
-- Bypass RLS: à exécuter en service_role (par défaut dans le SQL Editor).
-- ============================================================================

DO $$
DECLARE
  v_owner uuid := '00000000-0000-0000-0000-000000000000';
  v_now   timestamptz := now();
BEGIN

-- Si le placeholder est resté, prends le premier user existant
IF v_owner = '00000000-0000-0000-0000-000000000000' THEN
  SELECT id INTO v_owner FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Aucun user dans auth.users. Inscris-toi d''abord sur l''app.';
  END IF;
END IF;

-- ============================================================================
-- 1. MÉMORIAUX (5 publics)
-- ============================================================================
INSERT INTO "Memorial" (id, slug, "ownerId", firstname, lastname, nickname, "birthDate", "deathDate", language, "isPublic", description, "donationGoalCents", "createdAt", "updatedAt")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'antoinette-dupont', v_owner, 'Antoinette', 'Dupont', 'Toinette', '1942-04-12', '2024-08-23', 'fr', true,
   'Antoinette aimait la couture, ses petits-enfants, et les rosiers de son jardin de Touraine. Toujours un mot doux pour qui passait sa porte.',
   50000, v_now - interval '12 days', v_now - interval '12 days'),
  ('22222222-2222-2222-2222-222222222222', 'marc-lefevre', v_owner, 'Marc', 'Lefèvre', NULL, '1958-11-03', '2024-10-15', 'fr', true,
   'Pompier volontaire pendant 30 ans, Marc a passé sa retraite à enseigner la photographie aux enfants du quartier. Un homme de cœur.',
   80000, v_now - interval '8 days', v_now - interval '8 days'),
  ('33333333-3333-3333-3333-333333333333', 'james-okonkwo', v_owner, 'James', 'Okonkwo', 'Jay', '1975-06-21', '2025-01-09', 'fr', true,
   'Né à Lagos, devenu Lyonnais d''adoption. Médecin, mélomane et père. James laisse une trace lumineuse chez tous ceux qui l''ont croisé.',
   100000, v_now - interval '5 days', v_now - interval '5 days'),
  ('44444444-4444-4444-4444-444444444444', 'sofia-bernardi', v_owner, 'Sofia', 'Bernardi', NULL, '1989-02-14', '2025-03-02', 'fr', true,
   'Architecte passionnée par la lumière naturelle. Sofia a réinventé chaque maison qu''elle a touchée. Sa générosité reste son plus bel héritage.',
   30000, v_now - interval '3 days', v_now - interval '3 days'),
  ('55555555-5555-5555-5555-555555555555', 'henri-castel', v_owner, 'Henri', 'Castel', 'Riri', '1937-09-30', '2025-04-18', 'fr', true,
   'Ancien instituteur du village. Henri savait raconter une histoire comme personne. Ses élèves de 1968 lui rendent encore hommage chaque année.',
   60000, v_now - interval '1 day', v_now - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. PHOTOS (1 par mémorial — placeholders unsplash)
-- ============================================================================
INSERT INTO "Photo" (id, "memorialId", url, caption, position, "createdAt")
VALUES
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800', 'Antoinette dans son jardin', 0, v_now - interval '12 days'),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=800', 'Marc, atelier photo', 0, v_now - interval '8 days'),
  ('a3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', 'James, congrès Lyon 2018', 0, v_now - interval '5 days'),
  ('a4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', 'Sofia, projet Milan', 0, v_now - interval '3 days'),
  ('a5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800', 'Henri devant son école', 0, v_now - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. TÉMOIGNAGES (≈4 par mémorial = 19 total)
-- ============================================================================
INSERT INTO "Testimonial" (id, "memorialId", "authorId", "authorName", message, language, "createdAt")
VALUES
  -- Antoinette
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', v_owner, 'Camille', 'Mamie nous a appris à attendre les choses simples : le pain qui sort du four, les premières fraises de juin, les rires d''enfants dans la cour. Tu nous manques tellement.', 'fr', v_now - interval '11 days'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', v_owner, 'Bernard', 'Voisine extraordinaire pendant 40 ans. Antoinette gardait toujours un café chaud et une oreille attentive. Repose en paix.', 'fr', v_now - interval '9 days'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', v_owner, 'Élise', 'Tes confitures de groseille étaient légendaires. J''en ai planté un buisson cette année, en pensant à toi.', 'fr', v_now - interval '6 days'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', v_owner, 'Pierre & Margot', 'Marraine de cœur, conseillère de toujours. Merci pour les après-midis tricot et les conseils murmurés.', 'fr', v_now - interval '2 days'),
  -- Marc
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', v_owner, 'Caserne 14', 'Capitaine, tu nous as tout appris : le sang-froid, le respect, l''entraide. Une minute de silence ne suffira jamais.', 'fr', v_now - interval '7 days'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', v_owner, 'Lou, 12 ans', 'Tu m''as offert mon premier appareil photo. Aujourd''hui je vais faire l''école de photographie. Promis Marc.', 'fr', v_now - interval '5 days'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', v_owner, 'Nathalie', 'Mon frère, mon roc. Le silence est tellement plus fort sans tes blagues à table.', 'fr', v_now - interval '4 days'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', v_owner, 'Jean-Marc', 'On boira un dernier verre quand on se retrouvera, vieux frère. En attendant, je veille sur la famille.', 'fr', v_now - interval '1 day'),
  -- James
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', v_owner, 'Dr. Karine M.', 'Confrère pendant 20 ans. James avait le don rare de réconforter même les plus angoissés. Le service ne sera plus jamais le même.', 'fr', v_now - interval '4 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', v_owner, 'Aliyah', 'Papa, ton rire dans la cuisine, ton amour des sax-soli, tout reste vivant ici. On t''aime au-delà des mots.', 'fr', v_now - interval '3 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', v_owner, 'Chibuzo', 'Cousin, tu as été le pont entre Lagos et Lyon pour toute la famille. Ton héritage perdure.', 'fr', v_now - interval '2 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', v_owner, 'Marco', 'Coup de cœur immédiat à notre rencontre en 2009. Mon meilleur ami. Le silence est insupportable.', 'fr', v_now - interval '1 day'),
  -- Sofia
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', v_owner, 'Atelier Bernardi+Cie', 'Sofia, chaque ligne de tes plans portait ta lumière. L''agence continuera ton œuvre. On essaiera d''être à la hauteur.', 'fr', v_now - interval '3 days'),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', v_owner, 'Maman', 'Ma fille, mon soleil. Comment continue-t-on quand l''ordre du monde s''effondre ?', 'fr', v_now - interval '2 days'),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', v_owner, 'Théo, 8 ans', 'Tata Sofia, tu m''as offert le château en carton qu''on avait construit ensemble. Je le garde toute ma vie.', 'fr', v_now - interval '12 hours'),
  -- Henri
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', v_owner, 'Promo 1968', 'Maître Castel, vous nous avez ouvert le monde via les livres. 57 ans plus tard, on lit encore avec tes voix.', 'fr', v_now - interval '20 hours'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', v_owner, 'Geneviève', 'Mon cher Henri, tu as transformé un village en famille. Ce mémorial est pour toi, comme toutes nos veillées d''été.', 'fr', v_now - interval '14 hours'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', v_owner, 'Mairie de Sault', 'L''école porte désormais ton nom. Nous sommes profondément honorés.', 'fr', v_now - interval '6 hours'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', v_owner, 'Petite-fille Léa', 'Papi, je t''envoie un livre par semaine au Ciel. Réponds-moi en rêve.', 'fr', v_now - interval '2 hours');

-- ============================================================================
-- 4. DONATIONS (Completed pour barre de progression)
-- ============================================================================
INSERT INTO "Donation" (id, "memorialId", amount, currency, status, "donorName", message, "createdAt")
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 5000,  'EUR', 'Completed', 'Bernard',  'Pour les rosiers du jardin.', v_now - interval '10 days'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 2500,  'EUR', 'Completed', 'Élise',    NULL,                          v_now - interval '7 days'),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 10000, 'EUR', 'Completed', 'Anonyme',  'En souvenir de Toinette.',   v_now - interval '4 days'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 15000, 'EUR', 'Completed', 'Caserne 14', 'Pour la fondation enfance.', v_now - interval '6 days'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 5000,  'EUR', 'Completed', 'Lou',        'Mon premier reflex.',         v_now - interval '4 days'),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', 25000, 'EUR', 'Completed', 'Jean-Marc',  NULL,                          v_now - interval '2 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 20000, 'EUR', 'Completed', 'Dr. Karine M.', 'Pour le fond pédiatrie.', v_now - interval '3 days'),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', 10000, 'EUR', 'Completed', 'Marco',         NULL,                       v_now - interval '2 days'),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 7500,  'EUR', 'Completed', 'Atelier Bernardi+Cie', NULL,                v_now - interval '2 days'),
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', 3000,  'EUR', 'Completed', 'Anonyme',              'Lumière à toi.',    v_now - interval '1 day'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 12000, 'EUR', 'Completed', 'Promo 1968',  NULL,                          v_now - interval '18 hours'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', 5000,  'EUR', 'Completed', 'Geneviève',   'Pour les livres de l''école.', v_now - interval '12 hours');

RAISE NOTICE 'Seed terminé. Owner = %', v_owner;
END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
SELECT
  m.firstname || ' ' || m.lastname AS memorial,
  m.slug,
  (SELECT count(*) FROM "Testimonial" WHERE "memorialId" = m.id)        AS testimonials,
  (SELECT coalesce(sum(amount), 0) FROM "Donation" WHERE "memorialId" = m.id AND status = 'Completed') AS raised_cents,
  m."donationGoalCents" AS goal_cents
FROM "Memorial" m
WHERE m."isPublic" = true
ORDER BY m."createdAt" DESC;
