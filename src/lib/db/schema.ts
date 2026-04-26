import type { ChatRole, ChatSessionStatus, TokenStatus } from '@/types/chat';

/**
 * DynamoDB-oriented persistence contract for the low-traffic AWS runtime.
 *
 * This file is not an infrastructure/migration system. It documents the durable
 * records the app expects so route handlers can stay behind repository/store
 * interfaces rather than depending on AWS SDK shapes.
 */
export const tokenRecordSchema = {
  table: 'DYNAMODB_TABLE_NAME single-table item: PK=TOKEN#<tokenHash>, SK=TOKEN',
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
  table: 'DYNAMODB_TABLE_NAME single-table item: PK=SESSION#<sessionId>, SK=SESSION',
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
  table: 'DYNAMODB_TABLE_NAME single-table item: PK=SESSION#<sessionId>, SK=MESSAGE#<createdAt>#<messageId>',
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

export type ChatMessageRow = {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  createdAt: string;
};
