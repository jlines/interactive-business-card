import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

import { createDynamoTokenStore, createMemoryTokenStore, type TokenStore } from '@/lib/auth/token-store';
import type { TokenValidationResult } from '@/types/chat';

let tokenStore: TokenStore | null = null;

export async function validateEntryToken(token: string): Promise<TokenValidationResult> {
  const record = await getConfiguredTokenStore().getByToken(token);

  if (!record || record.status !== 'active') {
    return { valid: false };
  }

  return {
    valid: true,
    record: {
      id: record.id,
      label: record.label,
      audienceHint: record.audienceHint,
      customOpener: record.customOpener,
      notes: record.notes,
      status: record.status,
    },
  };
}

export function resetTokenStoreForTests() {
  tokenStore = null;
}

export function setTokenStoreForTests(store: TokenStore | null) {
  tokenStore = store;
}

export function getConfiguredTokenStore(): TokenStore {
  if (tokenStore) {
    return tokenStore;
  }

  const pepper = process.env.TOKEN_PEPPER?.trim() || 'local-dev-token-pepper';
  const tableName = process.env.TOKEN_TABLE_NAME?.trim();

  if (!tableName) {
    tokenStore = createMemoryTokenStore({ pepper, seedDemoToken: true });
    return tokenStore;
  }

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: process.env.AWS_REGION ?? process.env.BEDROCK_REGION ?? 'us-east-1',
    }),
    {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    },
  );

  tokenStore = createDynamoTokenStore({ client, tableName, pepper });
  return tokenStore;
}
