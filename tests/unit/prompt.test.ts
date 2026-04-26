import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assembleProviderMessages, buildPromptBundle } from '@/lib/ai/prompt';
import type { TokenRecord } from '@/types/chat';

describe('prompt assembly', () => {
  it('preserves required layer ordering', async () => {
    const tokenRecord: TokenRecord = {
      id: 'token-id',
      label: 'Acme intro',
      audienceHint: 'operations lead',
      customOpener: 'Let us talk automation.',
      status: 'active',
    };

    const bundle = await buildPromptBundle(tokenRecord, [
      { id: 'message-1', role: 'user', content: 'What can Jason help with?' },
    ]);

    assert.deepEqual(
      bundle.layers.map((layer) => layer.name),
      [
        'base_system_instruction',
        'contracting_services_context',
        'token_personalization_policy',
        'token_personalization_context',
        'conversation_history',
      ],
    );

    const providerMessages = assembleProviderMessages(bundle);
    assert.equal(providerMessages[0].role, 'system');
    assert.match(providerMessages[0].content, /## base_system_instruction/);
    assert.match(providerMessages[0].content, /## contracting_services_context/);
    assert.match(providerMessages[0].content, /## token_personalization_policy/);
    assert.match(providerMessages[0].content, /## token_personalization_context/);
    assert.equal(providerMessages.at(-1)?.content, 'What can Jason help with?');
  });
});
