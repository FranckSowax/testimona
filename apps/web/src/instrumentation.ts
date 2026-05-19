/**
 * Next.js bootstrap hook. Loads the right Sentry config depending on runtime.
 * Re-export the sentry hook so unhandled errors are captured automatically.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
