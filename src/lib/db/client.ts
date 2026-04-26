import type { EntryTokenRow } from '@/lib/db/schema';

export type TokenStoreRecord = EntryTokenRow;

export interface TokenStore {
  /**
   * Looks up a token by its raw QR value. Implementations must hash with the
   * app pepper before comparing and must never persist the raw value.
   */
  getByToken(token: string): Promise<TokenStoreRecord | null>;
  create(record: TokenStoreRecord): Promise<void>;
  revoke(tokenHash: string): Promise<void>;
}

/**
 * Factory for the future local persistence adapter.
 *
 * SQLite remains the intended first implementation because token/session data is
 * small and local-first. Keep callers behind TokenStore so validation logic does
 * not depend on a specific database package.
 */
export function createTokenStore(): TokenStore {
  throw new Error('TODO: implement local SQLite persistence adapter for QR token records.');
}
