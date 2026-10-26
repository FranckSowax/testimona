-- ============================================================================
-- Contributions boutique : plus de données personnelles via l'API publique.
--
-- La policy `shopcontribution_select_public` rend visibles les contributions
-- réussies des mémoriaux publics, mais la lecture portait sur toutes les
-- colonnes : n'importe qui, avec la clé publique, lisait l'e-mail, le nom et
-- le message des contributeurs.
--
-- WHY: Postgres ne filtre pas les colonnes avec la RLS, seulement les lignes.
-- On retire donc la lecture de la table aux rôles publics, puis on leur rend
-- les seules colonnes non personnelles. Le service-role (serveur) garde tout.
-- Une colonne ajoutée plus tard ne sera pas lisible publiquement par défaut.
-- ============================================================================

revoke select on table public."ShopContribution" from anon, authenticated;

grant select (
  "id",
  "shopItemId",
  "amountCents",
  "status",
  "createdAt",
  "isAnonymous",
  "wantsItem"
) on table public."ShopContribution" to anon, authenticated;
