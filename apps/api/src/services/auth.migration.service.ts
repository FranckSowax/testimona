/**
 * Lazy migration service: bcrypt + JWT custom -> Supabase Auth.
 *
 * Strategy (per migration plan §3.2):
 *  - At login, if the user exists in our DB but `migratedAt` is NULL:
 *      1. Verify the password against the legacy bcrypt hash
 *         (CryptoService.verifyPassword already supports the legacy AES path
 *          via isLegacyPassword()).
 *      2. If valid, provision the user in Supabase Auth via the admin API
 *         using the SAME plaintext password.
 *      3. Stamp users.migratedAt = now() and clear users.passwordHash.
 *      4. Sign the user in via Supabase to obtain access + refresh tokens
 *         and return them to the client.
 *  - On subsequent logins, the legacy endpoint short-circuits and asks the
 *    client to use Supabase Auth directly.
 */
import { CryptoService } from './commons/crypto.service';
import { getSupabaseAdmin, isSupabaseConfigured } from './commons/supabase.service';
import logger from './commons/logger.service';

export interface LegacyMigrationOutcome {
  status: 'migrated' | 'already_migrated' | 'invalid_credentials' | 'unsupported';
  supabaseUserId?: string;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
  };
}

export interface LegacyUserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  migratedAt: Date | null;
  role: 'User' | 'Admin';
}

const serviceName = 'AuthMigrationService';

export class AuthMigrationService {
  private static _instance: AuthMigrationService;

  static getInstance(): AuthMigrationService {
    if (!AuthMigrationService._instance) {
      AuthMigrationService._instance = new AuthMigrationService();
    }
    return AuthMigrationService._instance;
  }

  async migrateOnLogin(
    user: LegacyUserRow,
    plaintextPassword: string,
  ): Promise<LegacyMigrationOutcome> {
    if (!isSupabaseConfigured()) {
      return { status: 'unsupported' };
    }
    if (user.migratedAt) {
      return { status: 'already_migrated' };
    }
    if (!user.passwordHash) {
      logger.warn(`${serviceName}: legacy user has no passwordHash`, { userId: user.id });
      return { status: 'invalid_credentials' };
    }

    const ok = await CryptoService.getInstance().verifyPassword(
      plaintextPassword,
      user.passwordHash,
    );
    if (!ok) return { status: 'invalid_credentials' };

    const supabase = getSupabaseAdmin();

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: user.email,
      password: plaintextPassword,
      email_confirm: true,
      user_metadata: { legacy_id: user.id },
      app_metadata: { role: user.role },
    });

    if (createErr) {
      logger.info(`${serviceName}: createUser failed, attempting reconcile`, {
        userId: user.id,
        error: createErr.message,
      });
    }

    const { data: signin, error: signinErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: plaintextPassword,
    });

    if (signinErr || !signin.session) {
      logger.error(`${serviceName}: post-migration signIn failed`, {
        userId: user.id,
        error: signinErr?.message,
      });
      return { status: 'invalid_credentials' };
    }

    return {
      status: 'migrated',
      supabaseUserId: created?.user?.id ?? signin.user.id,
      session: {
        access_token: signin.session.access_token,
        refresh_token: signin.session.refresh_token,
        expires_at: signin.session.expires_at,
      },
    };
  }
}
