import type { ChatMessage, TokenRecord } from './domain';

export type SessionItem = {
  id: string;
  tokenId: string;
  tokenRecord: TokenRecord;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  expiresAtEpoch: number;
};

export type TokenItem = TokenRecord & {
  tokenHash: string;
  createdAt?: string;
  revokedAt?: string;
  expiresAt?: string;
};
