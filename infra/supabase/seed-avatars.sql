-- ============================================================================
-- Testimona — seed-avatars.sql
-- Ajoute des photos de profil Unsplash variées aux demo data existantes.
-- Exécution : Supabase SQL Editor → coller → Run.
-- Pré-requis : seed.sql déjà exécuté (5 mémoriaux + testimonials + donations).
-- ============================================================================

DO $$
DECLARE
  v_owner uuid;
BEGIN

SELECT id INTO v_owner FROM auth.users ORDER BY created_at LIMIT 1;
IF v_owner IS NULL THEN
  RAISE EXCEPTION 'Aucun user dans auth.users.';
END IF;

-- ============================================================================
-- 1. Set owner avatar_url in user_metadata (visible dans header)
-- ============================================================================
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
  'avatar_url', 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop&crop=face',
  'full_name', 'Demo User',
  'nickname', 'demo'
)
WHERE id = v_owner;

-- ============================================================================
-- 2. Remplace les 5 photos memorial par des portraits Unsplash variés
-- ============================================================================

-- Antoinette Dupont (1942-2024) — older woman
UPDATE "Photo"
SET url = 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=800&h=800&fit=crop&crop=face',
    caption = 'Antoinette dans son jardin'
WHERE id = 'a1111111-1111-1111-1111-111111111111';

-- Marc Lefèvre (1958-2024) — older man
UPDATE "Photo"
SET url = 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=800&h=800&fit=crop&crop=face',
    caption = 'Marc, ancien pompier'
WHERE id = 'a2222222-2222-2222-2222-222222222222';

-- James Okonkwo (1975-2025) — Black mid-age doctor
UPDATE "Photo"
SET url = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&crop=face',
    caption = 'James, médecin lyonnais'
WHERE id = 'a3333333-3333-3333-3333-333333333333';

-- Sofia Bernardi (1989-2025) — young woman architect
UPDATE "Photo"
SET url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&h=800&fit=crop&crop=face',
    caption = 'Sofia, architecte'
WHERE id = 'a4444444-4444-4444-4444-444444444444';

-- Henri Castel (1937-2025) — older teacher
UPDATE "Photo"
SET url = 'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=800&h=800&fit=crop&crop=face',
    caption = 'Henri, instituteur'
WHERE id = 'a5555555-5555-5555-5555-555555555555';

RAISE NOTICE 'Avatars updated. Owner = %', v_owner;
END $$;

-- ============================================================================
-- VÉRIFICATION
-- ============================================================================
SELECT
  m.firstname || ' ' || m.lastname AS memorial,
  p.url AS portrait_url,
  p.caption
FROM "Memorial" m
JOIN "Photo" p ON p."memorialId" = m.id
WHERE m."isPublic" = true
ORDER BY m."createdAt" DESC;

SELECT
  email,
  raw_user_meta_data->>'avatar_url' AS avatar_url,
  raw_user_meta_data->>'nickname' AS nickname
FROM auth.users
ORDER BY created_at
LIMIT 1;
