'use client';

import { useActionState } from 'react';
import { removeShopItemAction, type ShopActionState } from '../_actions/shop';

/**
 * Standalone delete control for a shop item. Kept in its own file (not
 * as a `.RemoveButton` static on ShopOwnerPanel) because Next.js does
 * not forward static properties across the Server → Client component
 * boundary — accessing `ShopOwnerPanel.RemoveButton` from a server
 * component yields undefined and triggers React error #130.
 */
export function ShopItemRemoveButton({ itemId }: { itemId: string }) {
  const [, formAction, isPending] = useActionState<ShopActionState | null, FormData>(
    removeShopItemAction,
    null,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={itemId} />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Retirer cet article de la boutique"
        className="border-border text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive inline-flex h-8 w-8 items-center justify-center rounded-md border bg-white transition-colors disabled:opacity-50"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      </button>
    </form>
  );
}
