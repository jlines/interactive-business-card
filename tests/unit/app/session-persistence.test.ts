import test from 'node:test';
import assert from 'node:assert/strict';

import type { ChatMessage, TokenRecord } from '../../../src/types/chat';
import {
  createDynamoSessionRepository,
  createMemorySessionRepository,
} from '../../../src/lib/session/repository';

const tokenRecord: TokenRecord = {
  id: 'token-123',
  label: 'warm lead',
  audienceHint: 'operations',
  customOpener: 'hello there',
  status: 'active',
};

const userMessage: ChatMessage = {
  id: 'msg-user-1',
  role: 'user',
  content: 'Can you help us automate intake?',
};

test('memory session repository stores and appends chat messages', async () => {
  const repo = createMemorySessionRepository();

  const created = await repo.create({
    id: 'session-1',
    tokenRecord,
    tokenId: tokenRecord.id,
    messages: [],
  });

  assert.equal(created.id, 'session-1');
  assert.deepEqual(await repo.get('session-1'), created);

  const updated = await repo.appendMessages('session-1', [userMessage]);
  assert.equal(updated.messages.length, 1);
  assert.equal(updated.messages[0]?.content, userMessage.content);
});

test('dynamo session repository writes ttl and token data', async () => {
  const sentCommands: Array<{ input: { TableName: string; Item: { id: string; tokenId: string; messages: Array<{ content: string }>; expiresAtEpoch: number } } }> = [];
  const fakeClient = {
    async send(command: { input: { TableName: string; Item: { id: string; tokenId: string; messages: Array<{ content: string }>; expiresAtEpoch: number } } }) {
      sentCommands.push(command);
      return {};
    },
  };

  const repo = createDynamoSessionRepository({
    client: fakeClient,
    tableName: 'sessions-table',
    ttlHours: 24,
  });

  await repo.create({
    id: 'session-2',
    tokenId: tokenRecord.id,
    tokenRecord,
    messages: [userMessage],
  });

  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0]?.input.TableName, 'sessions-table');
  assert.equal(sentCommands[0]?.input.Item.id, 'session-2');
  assert.equal(sentCommands[0]?.input.Item.tokenId, tokenRecord.id);
  assert.equal(sentCommands[0]?.input.Item.messages[0]?.content, userMessage.content);
  assert.equal(typeof sentCommands[0]?.input.Item.expiresAtEpoch, 'number');
});

test('dynamo session repository hydrates records from DynamoDB responses', async () => {
  const fakeClient = {
    async send() {
      return {
        Item: {
          id: 'session-3',
          tokenId: tokenRecord.id,
          tokenRecord,
          messages: [userMessage],
        },
      };
    },
  };

  const repo = createDynamoSessionRepository({
    client: fakeClient,
    tableName: 'sessions-table',
    ttlHours: 24,
  });

  const loaded = await repo.get('session-3');
  assert.equal(loaded?.id, 'session-3');
  assert.equal(loaded?.messages[0]?.role, 'user');
  assert.equal(loaded?.tokenRecord.label, tokenRecord.label);
});
