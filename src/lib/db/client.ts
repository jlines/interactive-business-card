export type TokenStoreRecord = {
  tokenHash: string;
  label: string;
  audienceHint?: string;
  customOpener?: string;
  status: 'active' | 'revoked' | 'expired';
};

export interface TokenStore {
  getByToken(token: string): Promise<TokenStoreRecord | null>;
  create(record: TokenStoreRecord): Promise<void>;
  revoke(tokenHash: string): Promise<void>;
}

export function createTokenStore(): TokenStore {
  throw new Error('TODO: implement local persistence adapter for QR token records.');
}
