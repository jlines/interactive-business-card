import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

import type { ChatMessage, TokenRecord } from '@/types/chat';
import type { ChatSession } from '@/lib/session/types';

type SendCapableClient = {
  send(command: { input: Record<string, unknown> }): Promise<Record<string, unknown>>;
};

type PersistedChatSession = ChatSession & {
  createdAt: string;
  updatedAt: string;
  expiresAtEpoch: number;
};

export interface SessionRepository {
  create(session: ChatSession): Promise<ChatSession>;
  get(sessionId: string): Promise<ChatSession | null>;
  appendMessages(sessionId: string, nextMessages: ChatMessage[]): Promise<ChatSession>;
}

export function createMemorySessionRepository(): SessionRepository {
  const sessions = new Map<string, ChatSession>();

  return {
    async create(session) {
      sessions.set(session.id, session);
      return session;
    },
    async get(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
    async appendMessages(sessionId, nextMessages) {
      const session = sessions.get(sessionId);

      if (!session) {
        throw new Error(`Unknown session: ${sessionId}`);
      }

      const updatedSession: ChatSession = {
        ...session,
        messages: [...session.messages, ...nextMessages],
      };

      sessions.set(sessionId, updatedSession);
      return updatedSession;
    },
  };
}

export function createDynamoSessionRepository({
  client,
  tableName,
  ttlHours,
}: {
  client: SendCapableClient;
  tableName: string;
  ttlHours: number;
}): SessionRepository {
  return {
    async create(session) {
      const now = new Date().toISOString();
      const persisted = toPersistedSession(session, ttlHours, now, now);

      await client.send(new PutCommand({
        TableName: tableName,
        Item: persisted,
      }));

      return fromPersistedSession(persisted);
    },
    async get(sessionId) {
      const response = await client.send(new GetCommand({
        TableName: tableName,
        Key: { id: sessionId },
      }));

      const item = (response as { Item?: PersistedChatSession }).Item;
      return item ? fromPersistedSession(item) : null;
    },
    async appendMessages(sessionId, nextMessages) {
      const current = await this.get(sessionId);

      if (!current) {
        throw new Error(`Unknown session: ${sessionId}`);
      }

      const updated: ChatSession = {
        ...current,
        messages: [...current.messages, ...nextMessages],
      };
      const now = new Date().toISOString();
      const persisted = toPersistedSession(updated, ttlHours, now, now);

      await client.send(new PutCommand({
        TableName: tableName,
        Item: persisted,
      }));

      return fromPersistedSession(persisted);
    },
  };
}

function toPersistedSession(
  session: ChatSession,
  ttlHours: number,
  createdAt: string,
  updatedAt: string,
): PersistedChatSession {
  return {
    ...session,
    tokenRecord: sanitizeTokenRecord(session.tokenRecord),
    messages: session.messages,
    createdAt,
    updatedAt,
    expiresAtEpoch: Math.floor(Date.now() / 1000) + ttlHours * 60 * 60,
  };
}

function fromPersistedSession(session: PersistedChatSession): ChatSession {
  return {
    id: session.id,
    tokenId: session.tokenId,
    tokenRecord: sanitizeTokenRecord(session.tokenRecord),
    messages: session.messages,
  };
}

function sanitizeTokenRecord(tokenRecord: TokenRecord): TokenRecord {
  return {
    id: tokenRecord.id,
    label: tokenRecord.label,
    audienceHint: tokenRecord.audienceHint,
    customOpener: tokenRecord.customOpener,
    notes: tokenRecord.notes,
    status: tokenRecord.status,
  };
}
