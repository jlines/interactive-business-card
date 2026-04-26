import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEntryToken, resetTokenStoreForTests, setTokenStoreForTests } from '../../../src/lib/auth/token';
import type { StoredTokenRecord, TokenStore } from '../../../src/lib/auth/token-store';
import { createSession, resetSessions, setSessionRepositoryForTests } from '../../../src/lib/session/store';
import type { SessionRepository } from '../../../src/lib/session/repository';
import type { ChatSession } from '../../../src/lib/session/types';
import { resetProviderTestHooks } from '../../../src/lib/ai/client';

const SESSION_FAILURE = { ok: false, message: 'This entry link is unavailable.' };
const CHAT_INPUT_FAILURE = { ok: false, message: 'Expected a sessionId and message.' };
const CHAT_AUTH_FAILURE = { ok: false, message: 'A valid session is required.' };
const CHAT_UNAVAILABLE_FAILURE = { ok: false, message: 'The chat service is unavailable.' };

const FORBIDDEN_RESPONSE_KEYS = new Set([
  'authReason',
  'failureReason',
  'rawToken',
  'reason',
  'stack',
  'token',
  'tokenHash',
  'tokenId',
  'tokenRecord',
]);

function prepareRouteTest() {
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.TOKEN_PEPPER = 'test-token-pepper';
  process.env.TOKEN_TABLE_NAME = '';
  process.env.SESSION_TABLE_NAME = '';
  process.env.MODEL_PROVIDER = '';
  process.env.OPENROUTER_API_KEY = '';
  process.env.BEDROCK_REGION = '';
  process.env.BEDROCK_MODEL_ID = '';

  resetProviderTestHooks();
  resetTokenStoreForTests();
  resetSessions();
}

async function postSessionJson(body: unknown) {
  const { POST } = await import('../../../src/app/api/session/route');
  return POST(jsonRequest('http://localhost/api/session', JSON.stringify(body)));
}

async function postSessionRaw(body: string) {
  const { POST } = await import('../../../src/app/api/session/route');
  return POST(jsonRequest('http://localhost/api/session', body));
}

async function postChatJson(body: unknown) {
  const { POST } = await import('../../../src/app/api/chat/route');
  return POST(jsonRequest('http://localhost/api/chat', JSON.stringify(body)));
}

async function postChatRaw(body: string) {
  const { POST } = await import('../../../src/app/api/chat/route');
  return POST(jsonRequest('http://localhost/api/chat', body));
}

function jsonRequest(url: string, body: string) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

async function assertJsonResponse(response: Response, status: number, body: unknown, rawValues: string[] = []) {
  assert.equal(response.status, status);
  const payload = await response.json();
  assert.deepEqual(payload, body);
  assertNoInternalLeaks(payload, rawValues);
}

function assertNoInternalLeaks(payload: unknown, rawValues: string[] = []) {
  assertNoForbiddenKeys(payload);
  const serialized = JSON.stringify(payload);

  for (const rawValue of rawValues) {
    assert.equal(
      serialized.includes(rawValue),
      false,
      `response leaked raw internal value: ${rawValue}`,
    );
  }
}

function assertNoForbiddenKeys(value: unknown) {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      assertNoForbiddenKeys(item);
    }
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert.equal(FORBIDDEN_RESPONSE_KEYS.has(key), false, `response leaked internal key: ${key}`);
    assertNoForbiddenKeys(child);
  }
}

function createTokenStoreWithRecord(rawToken: string, record: StoredTokenRecord): TokenStore {
  return {
    async getByToken(candidate) {
      return candidate === rawToken ? record : null;
    },
    async create() {
      throw new Error('not implemented for this test');
    },
    async revoke() {
      throw new Error('not implemented for this test');
    },
  };
}

function tokenRecord(status: StoredTokenRecord['status']): StoredTokenRecord {
  return {
    id: `${status}-token-id`,
    tokenHash: `${status}-token-hash`,
    label: `${status} token`,
    audienceHint: 'test audience',
    customOpener: 'Test opener.',
    status,
  };
}

test('session route creates a minimal session response for a valid token', async () => {
  prepareRouteTest();

  const response = await postSessionJson({ token: '  demo-card  ' });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.sessionId, 'string');
  assert.deepEqual(Object.keys(payload).sort(), ['ok', 'openingContext', 'sessionId']);
  assert.equal(payload.openingContext?.opener, 'Glad you scanned this — tell me a little about what you are trying to build or simplify.');
  assert.equal(payload.openingContext?.label, 'demo business card');
  assert.equal(payload.openingContext?.audienceHint, 'general warm lead');
  assertNoInternalLeaks(payload, ['demo-card']);
});

test('session route returns the uniform 401 body for malformed JSON', async () => {
  prepareRouteTest();

  const response = await postSessionRaw('{');

  await assertJsonResponse(response, 401, SESSION_FAILURE, ['demo-card']);
});

test('session route returns the uniform 401 body for missing, empty, and wrong-shaped tokens', async () => {
  const cases: Array<{ body: unknown; rawValues?: string[] }> = [
    { body: {} },
    { body: { token: '' } },
    { body: { token: '   ' } },
    { body: { token: { raw: 'demo-card' } }, rawValues: ['demo-card'] },
  ];

  for (const { body, rawValues = [] } of cases) {
    prepareRouteTest();
    const response = await postSessionJson(body);
    await assertJsonResponse(response, 401, SESSION_FAILURE, rawValues);
  }
});

test('session route returns the uniform 401 body for invalid, revoked, and expired tokens', async () => {
  prepareRouteTest();
  await assertJsonResponse(
    await postSessionJson({ token: 'not-a-real-entry-token' }),
    401,
    SESSION_FAILURE,
    ['not-a-real-entry-token'],
  );

  prepareRouteTest();
  setTokenStoreForTests(createTokenStoreWithRecord('revoked-entry-token', tokenRecord('revoked')));
  await assertJsonResponse(
    await postSessionJson({ token: 'revoked-entry-token' }),
    401,
    SESSION_FAILURE,
    ['revoked-entry-token', 'revoked-token-hash'],
  );

  prepareRouteTest();
  setTokenStoreForTests(createTokenStoreWithRecord('expired-entry-token', tokenRecord('expired')));
  await assertJsonResponse(
    await postSessionJson({ token: 'expired-entry-token' }),
    401,
    SESSION_FAILURE,
    ['expired-entry-token', 'expired-token-hash'],
  );
});

test('chat route returns 400 for malformed JSON', async () => {
  prepareRouteTest();

  const response = await postChatRaw('{');

  await assertJsonResponse(response, 400, CHAT_INPUT_FAILURE);
});

test('chat route returns 400 for schema failures and empty messages', async () => {
  const cases: unknown[] = [
    {},
    { sessionId: '', message: 'hello' },
    { sessionId: 'session-123', message: '' },
    { sessionId: 'session-123', message: '   ' },
    { sessionId: 123, message: 'hello' },
  ];

  for (const body of cases) {
    prepareRouteTest();
    const response = await postChatJson(body);
    await assertJsonResponse(response, 400, CHAT_INPUT_FAILURE);
  }
});

test('chat route returns 401 for an unknown session without leaking auth details', async () => {
  prepareRouteTest();

  const response = await postChatJson({ sessionId: 'missing', message: 'hello' });

  await assertJsonResponse(response, 401, CHAT_AUTH_FAILURE, ['missing']);
});

test('chat route returns 502 for runtime failures without leaking provider or token internals', async () => {
  prepareRouteTest();
  const session = await createDemoSession();
  const failingRepository: SessionRepository = {
    async create(nextSession) {
      return nextSession;
    },
    async get(sessionId) {
      return sessionId === session.id ? session : null;
    },
    async appendMessages() {
      throw new Error('provider exploded with tokenHash=secret-token-hash and reason=upstream_timeout');
    },
  };
  setSessionRepositoryForTests(failingRepository);

  const response = await postChatJson({ sessionId: session.id, message: 'hello' });

  await assertJsonResponse(response, 502, CHAT_UNAVAILABLE_FAILURE, [
    'provider exploded',
    'secret-token-hash',
    'upstream_timeout',
  ]);
});

test('chat route sends a turn and returns the canonical success body', async () => {
  prepareRouteTest();
  const session = await createDemoSession();

  const response = await postChatJson({
    sessionId: session.id,
    message: '  Can Jason help automate our intake workflow?  ',
  });

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.deepEqual(Object.keys(payload).sort(), ['message', 'messages', 'ok', 'sessionId']);
  assert.equal(payload.sessionId, session.id);
  assert.equal(payload.message.role, 'assistant');
  assert.equal(typeof payload.message.id, 'string');
  assert.equal(typeof payload.message.content, 'string');
  assert.equal(payload.message.content.length > 0, true);
  assert.equal(Array.isArray(payload.messages), true);
  assert.equal(payload.messages.length, 3);
  assert.equal(payload.messages.at(-2)?.role, 'user');
  assert.equal(payload.messages.at(-2)?.content, 'Can Jason help automate our intake workflow?');
  assert.deepEqual(payload.messages.at(-1), payload.message);
  assertNoInternalLeaks(payload, ['demo-card']);
});

async function createDemoSession(): Promise<ChatSession> {
  const tokenResult = await validateEntryToken('demo-card');
  assert.equal(tokenResult.valid, true);
  if (!tokenResult.valid) {
    throw new Error('expected valid demo token');
  }

  return createSession(tokenResult.record);
}
