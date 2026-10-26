export type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };

export type Brand<T, B> = T & { readonly __brand: B };
export type MemorialId = Brand<string, 'MemorialId'>;
export type UserId = Brand<string, 'UserId'>;
export type DonationId = Brand<string, 'DonationId'>;

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
}
