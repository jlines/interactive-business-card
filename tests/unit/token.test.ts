import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import type { createTokenStore as createTokenStoreType, resetMemoryPersistenceForTests as resetMemoryPersistenceForTestsType } from '@/lib/db/client';
import type { validateEntryToken as validateEntryTokenType } from '@/lib/auth/token';

process.env.TOKEN_PEPPER = 'test-pepper';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.PERSISTENCE_ADAPTER = 'memory';
process.env.MODEL_PROVIDER = 'openrouter';

let createTokenStore: typeof createTokenStoreType;
let resetMemoryPersistenceForTests: typeof resetMemoryPersistenceForTestsType;
let validateEntryToken: typeof validateEntryTokenType;

describe('validateEntryToken', () => {
  before(async () => {
    const db = await import('@/lib/db/client');
    const token = await import('@/lib/auth/token');
    createTokenStore = db.createTokenStore;
    resetMemoryPersistenceForTests = db.resetMemoryPersistenceForTests;
    validateEntryToken = token.validateEntryToken;
  });

  beforeEach(() => {
    resetMemoryPersistenceForTests();
  });

  it('fails closed for missing and malformed tokens', async () => {
    assert.deepEqual(await validateEntryToken(undefined), {
      valid: false,
      reason: 'missing',
      publicMessage: 'This entry link is unavailable.',
    });

    assert.deepEqual(await validateEntryToken('not valid!'), {
      valid: false,
      reason: 'malformed',
      publicMessage: 'This entry link is unavailable.',
    });
  });

  it('fails closed for unknown, expired, and revoked tokens', async () => {
    const store = createTokenStore();

    await store.create({
      rawToken: 'expired-token',
      label: 'expired',
      expiresAt: '2020-01-01T00:00:00.000Z',
    });
    await store.create({
      rawToken: 'revoked-token',
      label: 'revoked',
      status: 'revoked',
    });

    assert.equal((await validateEntryToken('unknown-token')).valid, false);
    assert.deepEqual(await validateEntryToken('expired-token'), {
      valid: false,
      reason: 'expired',
      publicMessage: 'This entry link is unavailable.',
    });
    assert.deepEqual(await validateEntryToken('revoked-token'), {
      valid: false,
      reason: 'revoked',
      publicMessage: 'This entry link is unavailable.',
    });
  });

  it('returns safe token metadata for valid persisted tokens', async () => {
    await createTokenStore().create({
      rawToken: 'valid-token',
      id: 'token-id',
      label: 'valid label',
      audienceHint: 'buyer',
    });

    const result = await validateEntryToken('valid-token');

    assert.equal(result.valid, true);
    if (result.valid) {
      assert.equal(result.record.id, 'token-id');
      assert.equal(result.record.label, 'valid label');
      assert.notEqual(result.record.tokenHash, 'valid-token');
    }
  });
});
