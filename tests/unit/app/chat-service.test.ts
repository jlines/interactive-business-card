import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEntryToken } from '../../../src/lib/auth/token';
import { createSession, getSession, resetSessions } from '../../../src/lib/session/store';
import { sendChatTurn } from '../../../src/lib/chat/service';

test('createSession seeds the conversation with the personalized opener', async () => {
  resetSessions();

  const tokenResult = await validateEntryToken('demo-card');
  assert.equal(tokenResult.valid, true);
  if (!tokenResult.valid) throw new Error('expected valid token');

  const session = await createSession(tokenResult.record);

  assert.equal(session.tokenId, tokenResult.record.id);
  assert.equal(session.messages.length, 1);
  assert.equal(session.messages[0]?.role, 'assistant');
  assert.match(session.messages[0]?.content ?? '', /Glad you scanned this/i);

  const stored = await getSession(session.id);
  assert.equal(stored?.id, session.id);
});

test('sendChatTurn appends user and assistant messages with a grounded reply', async () => {
  resetSessions();

  const tokenResult = await validateEntryToken('demo-card');
  assert.equal(tokenResult.valid, true);
  if (!tokenResult.valid) throw new Error('expected valid token');

  const session = await createSession(tokenResult.record);
  const reply = await sendChatTurn({
    sessionId: session.id,
    message: 'Can Jason help automate our intake workflow for a small team?',
  });

  assert.equal(reply.session.id, session.id);
  assert.equal(reply.assistantMessage.role, 'assistant');
  assert.match(reply.assistantMessage.content, /workflow automation|internal tools|AI/i);
  assert.match(reply.assistantMessage.content, /next step|describe|workflow|bottleneck/i);
  assert.equal(reply.session.messages.at(-2)?.role, 'user');
  assert.equal(reply.session.messages.at(-1)?.role, 'assistant');
});

test('sendChatTurn rejects unknown session ids', async () => {
  resetSessions();

  await assert.rejects(
    () => sendChatTurn({ sessionId: 'missing-session', message: 'hello' }),
    /session/i,
  );
});
