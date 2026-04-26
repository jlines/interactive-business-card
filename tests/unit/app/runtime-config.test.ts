import test from 'node:test';
import assert from 'node:assert/strict';

import { getProviderRuntimeConfig } from '../../../src/lib/ai/runtime-config';

test('getProviderRuntimeConfig returns openrouter mode when api key is present', () => {
  const config = getProviderRuntimeConfig({
    MODEL_PROVIDER: 'openrouter',
    OPENROUTER_API_KEY: 'key',
    OPENROUTER_MODEL: 'openai/gpt-4.1-mini',
  });

  assert.deepEqual(config, {
    provider: 'openrouter',
    openRouterModel: 'openai/gpt-4.1-mini',
    openRouterApiKey: 'key',
    bedrockRegion: undefined,
    bedrockModelId: undefined,
    ollamaBaseUrl: 'http://127.0.0.1:11434',
    ollamaModel: 'llama3.1:8b',
    canCallProvider: true,
  });
});

test('getProviderRuntimeConfig keeps bedrock mode even without api key', () => {
  const config = getProviderRuntimeConfig({
    MODEL_PROVIDER: 'bedrock',
    BEDROCK_REGION: 'us-east-1',
    BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
  });

  assert.equal(config.provider, 'bedrock');
  assert.equal(config.bedrockRegion, 'us-east-1');
  assert.equal(config.bedrockModelId, 'anthropic.claude-3-5-sonnet-20240620-v1:0');
  assert.equal(config.canCallProvider, true);
});

test('getProviderRuntimeConfig resolves ollama mode with local defaults', () => {
  const config = getProviderRuntimeConfig({
    MODEL_PROVIDER: 'ollama',
  });

  assert.equal(config.provider, 'ollama');
  assert.equal(config.ollamaBaseUrl, 'http://127.0.0.1:11434');
  assert.equal(config.ollamaModel, 'llama3.1:8b');
  assert.equal(config.canCallProvider, true);
});

test('getProviderRuntimeConfig disables remote calls when openrouter config is incomplete', () => {
  const config = getProviderRuntimeConfig({
    MODEL_PROVIDER: 'openrouter',
    OPENROUTER_MODEL: 'openai/gpt-4.1-mini',
  });

  assert.equal(config.provider, 'openrouter');
  assert.equal(config.canCallProvider, false);
});
