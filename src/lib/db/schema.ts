import type { ChatSessionStatus, TokenStatus } from '@/types/chat';

/**
 * SQLite-oriented schema contract for local persistence.
 *
 * This file is not a migration system yet. It documents the durable records the
 * app expects so the first storage implementation can be small and intentional.
 */
export const tokenRecordSchema = {
  table: 'entry_tokens',
  columns: {
    id: 'text primary key',
    tokenHash: 'text unique not null',
    label: 'text not null',
    audienceHint: 'text',
    customOpener: 'text',
    notes: 'text',
    status: 'text not null',
    createdAt: 'text not null',
    expiresAt: 'text',
    revokedAt: 'text',
  },
  invariants: [
    'Raw QR token values are never stored, only tokenHash.',
    'Only active, unexpired, unrevoked records may open a session.',
  ],
} as const;

export const chatSessionSchema = {
  table: 'chat_sessions',
  columns: {
    id: 'text primary key',
    tokenId: 'text not null references entry_tokens(id)',
    status: 'text not null',
    createdAt: 'text not null',
    lastSeenAt: 'text',
  },
  invariants: ['Every chat session belongs to exactly one validated entry token.'],
} as const;

export const chatMessageSchema = {
  table: 'chat_messages',
  columns: {
    id: 'text primary key',
    sessionId: 'text not null references chat_sessions(id)',
    role: 'text not null',
    content: 'text not null',
    createdAt: 'text not null',
  },
} as const;

export type EntryTokenRow = {
  id: string;
  tokenHash: string;
  label: string;
  audienceHint?: string;
  customOpener?: string;
  notes?: string;
  status: TokenStatus;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

export type ChatSessionRow = {
  id: string;
  tokenId: string;
  status: ChatSessionStatus;
  createdAt: string;
  lastSeenAt?: string;
};
