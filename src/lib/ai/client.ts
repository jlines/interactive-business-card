import type { ChatMessage } from '@/types/chat';
import { createOpenRouterClient } from './providers/openrouter';

export type ProviderName = 'openrouter' | 'bedrock';

export type ModelGenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
};

export type OpenRouterProviderConfig = {
  provider: 'openrouter';
  apiKey?: string;
  model: string;
  appName?: string;
};

export type BedrockProviderConfig = {
  provider: 'bedrock';
  region?: string;
  modelId?: string;
};

export type InferenceProviderConfig = OpenRouterProviderConfig | BedrockProviderConfig;

export type InferenceRequest = {
  messages: ChatMessage[];
  generation?: ModelGenerationConfig;
};

export type InferenceResponse = {
  message: ChatMessage;
  provider: ProviderName;
  model: string;
};

/**
 * Provider-agnostic model boundary for the app.
 *
 * Route handlers should depend on this interface, not on provider SDKs. The
 * first concrete path is OpenRouter; Bedrock is reserved as a later adapter so
 * the scaffold does not grow a provider framework before it is needed.
 */
export interface InferenceClient {
  provider: ProviderName;
  generate(request: InferenceRequest): Promise<InferenceResponse>;
}

function createBedrockPlaceholderClient(config: BedrockProviderConfig): InferenceClient {
  return {
    provider: 'bedrock',
    async generate() {
      throw new Error(
        `Bedrock adapter is intentionally not implemented yet. Later work should add an adapter for model ${
          config.modelId || '(unset)'
        } in region ${config.region || '(unset)'}.`,
      );
    },
  };
}

export function createInferenceClient(config: InferenceProviderConfig): InferenceClient {
  if (config.provider === 'openrouter') {
    return createOpenRouterClient(config);
  }

  return createBedrockPlaceholderClient(config);
}

export async function sendChatToProvider(messages: ChatMessage[], client: InferenceClient) {
  return client.generate({ messages });
}
