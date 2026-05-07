/**
 * Sentry init for the BFF.
 *
 * Wired in `app.ts` if `SENTRY_DSN` is set. No-op otherwise.
 * Captures unhandled exceptions, traces, and Express request errors.
 */
import express from 'express';
import logger from './logger.service';

let _sentryReady = false;
let _Sentry: typeof import('@sentry/node') | null = null;

export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('Sentry not configured (SENTRY_DSN missing) — skipping init');
    return;
  }

  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.GIT_SHA,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      integrations: [Sentry.httpIntegration()],
    });
    _Sentry = Sentry;
    _sentryReady = true;
    logger.info('Sentry initialized');
  } catch (err) {
    logger.warn('Sentry init failed', { error: (err as Error).message });
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!_sentryReady || !_Sentry) return;
  _Sentry.captureException(err, { extra: context });
}

export function expressErrorHandler(): express.ErrorRequestHandler {
  return (err, _req, _res, next) => {
    captureException(err);
    next(err);
  };
}
