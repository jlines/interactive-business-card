import { randomUUID, createHash } from 'node:crypto';

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

import type { TokenRecord } from '@/types/chat';

export type StoredTokenRecord = TokenRecord & {
  tokenHash: string;
};

export interface TokenStore {
  getByToken(token: string): Promise<StoredTokenRecord | null>;
  create(record: {
    rawToken: string;
    label: string;
    audienceHint?: string;
    customOpener?: string;
    notes?: string;
  }): Promise<StoredTokenRecord>;
  revoke(tokenHash: string): Promise<void>;
}

type SendCapableClient = {
  send(command: { input: Record<string, unknown> }): Promise<Record<string, unknown>>;
};

export async function hashEntryToken(token: string, pepper: string) {
  return createHash('sha256').update(`${pepper}:${token}`).digest('hex');
}

export function createMemoryTokenStore({ pepper, seedDemoToken = false }: { pepper: string; seedDemoToken?: boolean }): TokenStore {
  const records = new Map<string, StoredTokenRecord>();

  if (seedDemoToken) {
    const demoHash = createHash('sha256').update(`${pepper}:demo-card`).digest('hex');
    records.set(demoHash, {
      id: 'demo-token',
      tokenHash: demoHash,
      label: 'demo business card',
      audienceHint: 'general warm lead',
      customOpener: 'Glad you scanned this — tell me a little about what you are trying to build or simplify.',
      status: 'active',
    });
  }

  return {
    async getByToken(token) {
      const tokenHash = await hashEntryToken(token, pepper);
      return records.get(tokenHash) ?? null;
    },
    async create(record) {
      const tokenHash = await hashEntryToken(record.rawToken, pepper);
      const stored: StoredTokenRecord = {
        id: randomUUID(),
        tokenHash,
        label: record.label,
        audienceHint: record.audienceHint,
        customOpener: record.customOpener,
        notes: record.notes,
        status: 'active',
      };
      records.set(tokenHash, stored);
      return stored;
    },
    async revoke(tokenHash) {
      const current = records.get(tokenHash);
      if (!current) return;
      records.set(tokenHash, { ...current, status: 'revoked' });
    },
  };
}

export function createDynamoTokenStore({
  client,
  tableName,
  pepper,
}: {
  client: SendCapableClient;
  tableName: string;
  pepper: string;
}): TokenStore {
  return {
    async getByToken(token) {
      const tokenHash = await hashEntryToken(token, pepper);
      const response = await client.send(new GetCommand({
        TableName: tableName,
        Key: { tokenHash },
      }));

      return ((response as { Item?: StoredTokenRecord }).Item) ?? null;
    },
    async create(record) {
      const tokenHash = await hashEntryToken(record.rawToken, pepper);
      const stored: StoredTokenRecord = {
        id: randomUUID(),
        tokenHash,
        label: record.label,
        audienceHint: record.audienceHint,
        customOpener: record.customOpener,
        notes: record.notes,
        status: 'active',
      };

      await client.send(new PutCommand({
        TableName: tableName,
        Item: stored,
      }));

      return stored;
    },
    async revoke(tokenHash) {
      const response = await client.send(new GetCommand({
        TableName: tableName,
        Key: { tokenHash },
      }));
      const current = ((response as { Item?: StoredTokenRecord }).Item) ?? null;
      if (!current) {
        return;
      }

      await client.send(new PutCommand({
        TableName: tableName,
        Item: {
          ...current,
          status: 'revoked',
        },
      }));
    },
  };
}
