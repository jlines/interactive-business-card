import type { InferenceClient, InferenceResponse, OpenRouterProviderConfig } from '@/lib/ai/client';

/**
 * OpenRouter-oriented inference adapter seam.
 *
 * This file is intentionally small: it marks the first provider integration path
 * without introducing a generic provider framework. The next implementation pass
 * should add the HTTP call to OpenRouter's chat completions API here and keep
 * route handlers on the provider-agnostic InferenceClient interface.
 */
export function createOpenRouterClient(config: OpenRouterProviderConfig): InferenceClient {
  return {
    provider: 'openrouter',
    async generate(): Promise<InferenceResponse> {
      if (!config.apiKey) {
        throw new Error('OPENROUTER_API_KEY is required before calling OpenRouter inference.');
      }

      throw new Error(`TODO: call OpenRouter model ${config.model} and map the response to InferenceResponse.`);
    },
  };
}
