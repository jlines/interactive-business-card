import { createTokenStore, type TokenStore } from '@/lib/db/client';
import type { TokenRecord, TokenValidationFailureReason, TokenValidationResult } from '@/types/chat';

const failClosedMessage = 'This entry link is unavailable.';

function invalidToken(reason: TokenValidationFailureReason): TokenValidationResult {
  return { valid: false, reason, publicMessage: failClosedMessage };
}

function normalizeToken(rawToken: string | null | undefined) {
  return rawToken?.trim() ?? '';
}

function isPlausibleToken(rawToken: string) {
  return /^[a-zA-Z0-9_-]{8,128}$/.test(rawToken);
}

function tokenRecordIsUsable(record: TokenRecord, now = new Date()) {
  if (record.status === 'revoked' || record.revokedAt) {
    return invalidToken('revoked');
  }

  if (record.status === 'expired' || (record.expiresAt && new Date(record.expiresAt) <= now)) {
    return invalidToken('expired');
  }

  return { valid: true, record } satisfies TokenValidationResult;
}

/**
 * Server-side token gate for QR entry.
 *
 * This is the only place route handlers and pages should turn an opaque QR token
 * into safe application metadata. The raw token is normalized and plausibility
 * checked before a store lookup; persistence hashes it with TOKEN_PEPPER and
 * never stores raw token values.
 */
export async function validateEntryToken(
  token: string | null | undefined,
  tokenStore: TokenStore = createTokenStore(),
): Promise<TokenValidationResult> {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    return invalidToken('missing');
  }

  if (!isPlausibleToken(normalizedToken)) {
    return invalidToken('malformed');
  }

  const record = await tokenStore.getByRawToken(normalizedToken);

  if (!record) {
    return invalidToken('not_found');
  }

  return tokenRecordIsUsable(record);
}
