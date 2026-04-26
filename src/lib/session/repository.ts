import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

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

export function createFileSessionRepository({
  filePath,
  ttlHours,
}: {
  filePath: string;
  ttlHours: number;
}): SessionRepository {
  const resolvedPath = resolve(filePath);

  return {
    async create(session) {
      const store = await readSessionStore(resolvedPath);
      const now = new Date().toISOString();
      const persisted = toPersistedSession(session, ttlHours, now, now);
      store[persistKey(session.id)] = persisted;
      await writeSessionStore(resolvedPath, store);
      return fromPersistedSession(persisted);
    },
    async get(sessionId) {
      const store = await readSessionStore(resolvedPath);
      const persisted = store[persistKey(sessionId)];

      if (!persisted) {
        return null;
      }

      if (persisted.expiresAtEpoch <= Math.floor(Date.now() / 1000)) {
        delete store[persistKey(sessionId)];
        await writeSessionStore(resolvedPath, store);
        return null;
      }

      return fromPersistedSession(persisted);
    },
    async appendMessages(sessionId, nextMessages) {
      const store = await readSessionStore(resolvedPath);
      const persisted = store[persistKey(sessionId)];

      if (!persisted) {
        throw new Error(`Unknown session: ${sessionId}`);
      }

      const current = fromPersistedSession(persisted);
      const updated: ChatSession = {
        ...current,
        messages: [...current.messages, ...nextMessages],
      };
      const now = new Date().toISOString();
      const createdAt = persisted.createdAt;
      const nextPersisted = toPersistedSession(updated, ttlHours, createdAt, now);
      store[persistKey(sessionId)] = nextPersisted;
      await writeSessionStore(resolvedPath, store);

      return fromPersistedSession(nextPersisted);
    },
  };
}

type FileSessionStore = Record<string, PersistedChatSession>;

function persistKey(sessionId: string) {
  return `session:${sessionId}`;
}

async function readSessionStore(filePath: string): Promise<FileSessionStore> {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed as FileSessionStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }

    throw error;
  }
}

async function writeSessionStore(filePath: string, store: FileSessionStore): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  await rename(tempPath, filePath);
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
