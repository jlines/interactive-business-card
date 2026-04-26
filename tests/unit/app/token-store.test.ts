import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDynamoTokenStore,
  createMemoryTokenStore,
  hashEntryToken,
} from '../../../src/lib/auth/token-store';

const pepper = 'pepper-value';

test('hashEntryToken is deterministic and hides the raw token', async () => {
  const first = await hashEntryToken('demo-card', pepper);
  const second = await hashEntryToken('demo-card', pepper);

  assert.equal(first, second);
  assert.notEqual(first, 'demo-card');
  assert.match(first, /^[a-f0-9]{64}$/);
});

test('memory token store can create, fetch, and revoke a token', async () => {
  const store = createMemoryTokenStore({ pepper });

  const created = await store.create({
    rawToken: 'alpha-token',
    label: 'Alpha token',
    audienceHint: 'founder',
    customOpener: 'Tell me what you are building.',
  });

  const fetched = await store.getByToken('alpha-token');
  assert.equal(fetched?.label, 'Alpha token');
  assert.equal(fetched?.status, 'active');

  await store.revoke(created.tokenHash);
  const revoked = await store.getByToken('alpha-token');
  assert.equal(revoked?.status, 'revoked');
});

test('dynamo token store hashes raw tokens before writing', async () => {
  const sentCommands: Array<{ input: { TableName: string; Item: { tokenHash: string; label: string; rawToken?: string } } }> = [];
  const fakeClient = {
    async send(command: { input: { TableName: string; Item: { tokenHash: string; label: string; rawToken?: string } } }) {
      sentCommands.push(command);
      return {};
    },
  };

  const store = createDynamoTokenStore({
    client: fakeClient,
    tableName: 'tokens-table',
    pepper,
  });

  const created = await store.create({
    rawToken: 'beta-token',
    label: 'Beta token',
  });

  assert.equal(sentCommands.length, 1);
  assert.equal(sentCommands[0]?.input.TableName, 'tokens-table');
  assert.equal(sentCommands[0]?.input.Item.tokenHash, created.tokenHash);
  assert.equal(sentCommands[0]?.input.Item.label, 'Beta token');
  assert.equal(sentCommands[0]?.input.Item.rawToken, undefined);
});
