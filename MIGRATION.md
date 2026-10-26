# Migration — note historique

Le projet est passé d'un stack Angular 15 + Express monolithe à **Next.js 15 + Supabase**, par décision de repartir from-scratch (mai 2026).

L'ancien code Angular et l'ancien BFF Express ont été retirés du dépôt. Aucune migration de données n'est prévue : la nouvelle base est vide et les utilisateurs créeront un nouveau compte.

Pour la stack actuelle et le démarrage, voir [README.md](./README.md).

Référentiels conservés :
- [`supabase/migrations/`](./supabase/migrations/) — schéma et politiques RLS versionnés
- [`packages/shared/`](./packages/shared/) — schémas Zod du domaine
- [`testimona-audit (1).html`](./testimona-audit%20%281%29.html) — audit de l'ancienne plateforme (référence)
