import type { TokenRecord, TokenValidationFailureReason, TokenValidationResult } from '@/types/chat';

const failClosedMessage = 'This entry link is unavailable.';

const demoToken: TokenRecord = {
  id: 'demo-token',
  tokenHash: 'demo-token-hash-placeholder',
  label: 'demo business card',
  audienceHint: 'general warm lead',
  customOpener: 'Glad you scanned this — tell me a little about what you are trying to build or simplify.',
  status: 'active',
  createdAt: '2026-04-25T00:00:00.000Z',
};

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
 * into safe application metadata. The current scaffold has one deterministic
 * local demo token; the next persistence pass should replace that lookup with a
 * hashed-token store while preserving the fail-closed return type.
 */
export async function validateEntryToken(token: string | null | undefined): Promise<TokenValidationResult> {
  const normalizedToken = normalizeToken(token);

  if (!normalizedToken) {
    return invalidToken('missing');
  }

  if (!isPlausibleToken(normalizedToken)) {
    return invalidToken('malformed');
  }

  if (normalizedToken === 'demo-card') {
    return tokenRecordIsUsable(demoToken);
  }

  return invalidToken('not_found');
}
