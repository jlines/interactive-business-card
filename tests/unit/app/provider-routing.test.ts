import test from 'node:test';
import assert from 'node:assert/strict';

import type { PromptBundle } from '../../../src/lib/ai/client';
import { sendChatToProvider, setBedrockClientForTests, resetProviderTestHooks } from '../../../src/lib/ai/client';

const promptBundle: PromptBundle = {
  systemPrompt: 'You are a helpful assistant.',
  businessContext: 'Jason builds internal tools.',
  personalizationNotes: 'Keep it warm and concise.',
  tokenContext: {
    id: 'token-1',
    label: 'demo',
    audienceHint: 'ops lead',
    status: 'active',
  },
  messages: [
    { id: 'm1', role: 'user', content: 'Can you help our team automate intake?' },
  ],
};

test('sendChatToProvider uses Bedrock when runtime config is complete', async () => {
  process.env.MODEL_PROVIDER = 'bedrock';
  process.env.BEDROCK_REGION = 'us-east-1';
  process.env.BEDROCK_MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
  process.env.OPENROUTER_API_KEY = '';
  process.env.OLLAMA_BASE_URL = '';
  process.env.OLLAMA_MODEL = '';

  setBedrockClientForTests({
    async send() {
      return {
        output: {
          message: {
            content: [{ text: 'Bedrock handled this request.' }],
          },
        },
      };
    },
  });

  const reply = await sendChatToProvider(promptBundle);
  assert.equal(reply, 'Bedrock handled this request.');

  resetProviderTestHooks();
});

test('sendChatToProvider uses Ollama when runtime config selects ollama', async () => {
  process.env.MODEL_PROVIDER = 'ollama';
  process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
  process.env.OLLAMA_MODEL = 'llama3.1:8b';
  process.env.OPENROUTER_API_KEY = '';
  process.env.BEDROCK_REGION = '';
  process.env.BEDROCK_MODEL_ID = '';

  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      body: JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>,
    });

    return new Response(
      JSON.stringify({
        message: {
          content: 'Ollama handled this request.',
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const reply = await sendChatToProvider(promptBundle);
    assert.equal(reply, 'Ollama handled this request.');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(calls[0]?.body.model, 'llama3.1:8b');
    assert.equal(calls[0]?.body.stream, false);
  } finally {
    globalThis.fetch = originalFetch;
    resetProviderTestHooks();
  }
});
