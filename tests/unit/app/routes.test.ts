import test from 'node:test';
import assert from 'node:assert/strict';

import { resetSessions } from '../../../src/lib/session/store';

test('session route creates a session for a valid token', async () => {
  resetSessions();
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.TOKEN_PEPPER = 'test-token-pepper';

  const { POST } = await import('../../../src/app/api/session/route');
  const response = await POST(
    new Request('http://localhost/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'demo-card' }),
    }),
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.sessionId, 'string');
  assert.equal(payload.messages.length, 1);
});

test('chat route returns 404 for an unknown session', async () => {
  resetSessions();
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.TOKEN_PEPPER = 'test-token-pepper';

  const { POST } = await import('../../../src/app/api/chat/route');
  const response = await POST(
    new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 'missing', message: 'hello' }),
    }),
  );

  assert.equal(response.status, 404);
  const payload = await response.json();
  assert.equal(payload.ok, false);
});
