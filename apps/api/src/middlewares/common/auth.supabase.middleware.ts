/**
 * Supabase JWT bearer middleware.
 *
 * This middleware runs in PARALLEL to the legacy cookie-based JWT middleware
 * (jwt.middleware.ts). It validates an `Authorization: Bearer <jwt>` header
 * against Supabase's JWKS endpoint, and populates `req.user` on success.
 *
 * Routes can opt into this middleware on a per-route basis. Once Phase 3 of the
 * migration plan is complete, the legacy middleware can be removed and this
 * one becomes the sole authentication mechanism.
 */
import express from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import logger from '../../services/commons/logger.service';

interface SupabaseUserClaims extends JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  app_metadata?: { role?: 'User' | 'Admin' };
  user_metadata?: { legacy_id?: string };
}

declare global {
  namespace Express {
    interface Request {
      supabaseUser?: SupabaseUserClaims;
    }
  }
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (_jwks) return _jwks;
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL missing');
  _jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/keys`));
  return _jwks;
}

export async function requireSupabaseAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'missing bearer token' });
      return;
    }
    const token = header.slice('Bearer '.length);

    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });

    req.supabaseUser = payload as SupabaseUserClaims;
    next();
  } catch (err) {
    logger.warn('Supabase JWT verification failed', {
      error: (err as Error).message,
      path: req.path,
    });
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

export async function optionalSupabaseAuth(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    const token = header.slice('Bearer '.length);
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
    });
    req.supabaseUser = payload as SupabaseUserClaims;
  } catch {
    // swallow — fall through as anonymous
  }
  next();
}

export function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const role = req.supabaseUser?.app_metadata?.role;
  if (role !== 'Admin') {
    res.status(403).json({ error: 'admin required' });
    return;
  }
  next();
}
