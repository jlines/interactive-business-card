import test from 'node:test';
import assert from 'node:assert/strict';

import type { PromptBundle } from '../../../src/lib/ai/client';
import { sendBedrockChat } from '../../../src/lib/ai/bedrock';

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
    { id: 'm1', role: 'assistant', content: 'Hi there.' },
    { id: 'm2', role: 'user', content: 'Can you help us automate intake?' },
  ],
};

test('sendBedrockChat sends a converse request and returns assistant text', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const fakeClient = {
    async send(command: { input: Record<string, unknown> }) {
      calls.push(command.input);
      return {
        output: {
          message: {
            content: [
              { text: 'Yes — I can help streamline intake and handoffs.' },
            ],
          },
        },
      };
    },
  };

  const response = await sendBedrockChat({
    promptBundle,
    runtimeConfig: {
      provider: 'bedrock',
      bedrockRegion: 'us-east-1',
      bedrockModelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      canCallProvider: true,
    },
    client: fakeClient,
  });

  assert.equal(response, 'Yes — I can help streamline intake and handoffs.');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.modelId, 'anthropic.claude-3-5-sonnet-20240620-v1:0');
  assert.equal(Array.isArray(calls[0]?.messages), true);
  assert.match(JSON.stringify(calls[0]?.system), /helpful assistant/i);
});

test('sendBedrockChat throws when Bedrock returns no text', async () => {
  const fakeClient = {
    async send() {
      return { output: { message: { content: [] } } };
    },
  };

  await assert.rejects(
    () => sendBedrockChat({
      promptBundle,
      runtimeConfig: {
        provider: 'bedrock',
        bedrockRegion: 'us-east-1',
        bedrockModelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        canCallProvider: true,
      },
      client: fakeClient,
    }),
    /bedrock/i,
  );
});
