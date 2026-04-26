import assert from 'node:assert/strict';
import { before, beforeEach, describe, it } from 'node:test';
import type { createTokenStore as createTokenStoreType, resetMemoryPersistenceForTests as resetMemoryPersistenceForTestsType } from '@/lib/db/client';

process.env.TOKEN_PEPPER = 'test-pepper';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.PERSISTENCE_ADAPTER = 'memory';
process.env.MODEL_PROVIDER = 'openrouter';

let createTokenStore: typeof createTokenStoreType;
let resetMemoryPersistenceForTests: typeof resetMemoryPersistenceForTestsType;
let sessionPost: (request: Request) => Promise<Response>;
let chatPost: (request: Request) => Promise<Response>;

describe('session and chat route authorization', () => {
  before(async () => {
    const db = await import('@/lib/db/client');
    const sessionRoute = await import('@/app/api/session/route');
    const chatRoute = await import('@/app/api/chat/route');
    createTokenStore = db.createTokenStore;
    resetMemoryPersistenceForTests = db.resetMemoryPersistenceForTests;
    sessionPost = sessionRoute.POST;
    chatPost = chatRoute.POST;
  });

  beforeEach(() => {
    resetMemoryPersistenceForTests();
  });

  it('/api/session fails closed for invalid token state', async () => {
    const response = await sessionPost(
      new Request('http://localhost/api/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'missing-token' }),
      }),
    );
    const body = (await response.json()) as { ok: boolean; message: string };

    assert.equal(response.status, 401);
    assert.equal(body.ok, false);
    assert.equal(body.message, 'This entry link is unavailable.');
  });

  it('/api/session returns durable session id and opening context for valid tokens', async () => {
    await createTokenStore().create({
      rawToken: 'session-token',
      id: 'session-token-id',
      label: 'session label',
      customOpener: 'Hello from a durable session.',
    });

    const response = await sessionPost(
      new Request('http://localhost/api/session', {
        method: 'POST',
        body: JSON.stringify({ token: 'session-token' }),
      }),
    );
    const body = (await response.json()) as { ok: boolean; sessionId?: string; openingContext?: { opener?: string } };

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(typeof body.sessionId, 'string');
    assert.equal(body.openingContext?.opener, 'Hello from a durable session.');
  });

  it('/api/chat rejects missing and unauthorized session ids', async () => {
    const missingResponse = await chatPost(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Hello' }] }),
      }),
    );

    assert.equal(missingResponse.status, 401);

    const unauthorizedResponse = await chatPost(
      new Request('http://localhost/api/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'not-a-real-session', messages: [{ role: 'user', content: 'Hello' }] }),
      }),
    );

    assert.equal(unauthorizedResponse.status, 401);
  });
});
