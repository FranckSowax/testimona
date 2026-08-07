'use client';

import { useEffect } from 'react';

/**
 * Sends an already-signed-in visitor away from a login/signup screen.
 *
 * Used *instead of* `redirect()` inside the intercepting `@modal` slots. A
 * `redirect()` thrown from a parallel-route slot is fine on a plain navigation
 * but not when the slot is re-rendered in place — which is exactly what Next
 * does with the still-mounted login modal right after the sign-in Server
 * Action succeeds. The client router cannot apply a redirect to a slot it is
 * already showing and blows up with "Application error: a client-side
 * exception has occurred".
 *
 * A full document navigation has none of that ambiguity: the slot is torn
 * down, `default.tsx` takes over, and the whole tree is rendered server-side
 * with the fresh session cookie.
 */
export function AlreadyAuthenticated({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
}
