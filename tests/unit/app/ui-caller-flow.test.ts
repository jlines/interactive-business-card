import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as React from 'react';
import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import TokenEntryPage from '../../../src/app/c/[token]/page';
import { ChatShell } from '../../../src/components/chat/ChatShell';
import { bootstrapEntrySession } from '../../../src/components/entry/sessionBootstrap';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test('token entry page gates rendering without creating sessions directly', async () => {
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.TOKEN_PEPPER = 'test-token-pepper';

  const pageSource = await readFile('src/app/c/[token]/page.tsx', 'utf8');
  assert.doesNotMatch(pageSource, /createSession/);

  const element = await TokenEntryPage({ params: Promise.resolve({ token: 'demo-card' }) });
  assert.equal(isValidElement(element), true);
  assert.equal(element.props.token, 'demo-card');
  assert.equal(element.props.initialSession, undefined);
});

test('entry client bootstraps sessions through the session API contract', async () => {
  let requestedInput: RequestInfo | URL | undefined;
  let requestedInit: RequestInit | undefined;

  const result = await bootstrapEntrySession('demo-card', async (input, init) => {
    requestedInput = input;
    requestedInit = init;

    return Response.json({
      ok: true,
      sessionId: 'session-123',
      openingContext: {
        label: 'Acme team',
        opener: 'This opener came from the session API.',
      },
    });
  });

  assert.equal(requestedInput, '/api/session');
  assert.equal(requestedInit?.method, 'POST');
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), { token: 'demo-card' });
  assert.equal(result.sessionId, 'session-123');
  assert.equal(result.openingContext.opener, 'This opener came from the session API.');
});

test('entry client fails closed when session bootstrap fails', async () => {
  await assert.rejects(
    () => bootstrapEntrySession('expired-token', async () => (
      Response.json({ ok: false, message: 'This entry link is unavailable.' }, { status: 401 })
    )),
    /entry link is unavailable/i,
  );

  const welcomeSource = await readFile('src/components/entry/PersonalizedWelcome.tsx', 'utf8');
  assert.match(welcomeSource, /Link unavailable/);
  assert.doesNotMatch(welcomeSource, /createSession/);
  assert.doesNotMatch(welcomeSource, /tokenRecord/);
});

test('chat shell renders opener from openingContext', () => {
  const html = renderToStaticMarkup(
    createElement(ChatShell, {
      sessionId: 'session-123',
      openingContext: {
        label: 'Acme team',
        opener: 'This opener came from the session API.',
      },
    }),
  );

  assert.match(html, /Entry: Acme team/);
  assert.match(html, /This opener came from the session API\./);
});

test('chat shell keeps using the canonical chat API payload', async () => {
  const chatSource = await readFile('src/components/chat/ChatShell.tsx', 'utf8');

  assert.match(chatSource, /fetch\('\/api\/chat'/);
  assert.match(chatSource, /JSON\.stringify\(\{ sessionId, message \}\)/);
  assert.match(chatSource, /payload\.messages/);
  assert.doesNotMatch(chatSource, /tokenRecord/);
  assert.doesNotMatch(chatSource, /initialMessages\[0\]/);
});
