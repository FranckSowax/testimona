/**
 * Sentry — Node.js (server actions, route handlers, RSC) runtime config.
 * Uses the SENTRY_DSN env var (server-only) when defined; falls back to the
 * public DSN so a single var still works.
 */
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.GIT_SHA,
    tracesSampleRate: 0.1,
  });
}
