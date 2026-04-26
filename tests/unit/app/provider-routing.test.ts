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
