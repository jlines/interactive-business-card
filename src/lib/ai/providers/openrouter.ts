import { randomUUID } from 'node:crypto';
import type { InferenceClient, InferenceRequest, InferenceResponse, OpenRouterProviderConfig } from '@/lib/ai/client';

type OpenRouterChoice = {
  message?: {
    role?: string;
    content?: string | Array<{ type?: string; text?: string }>;
  };
};

type OpenRouterResponse = {
  model?: string;
  choices?: OpenRouterChoice[];
};

function extractContent(content: string | Array<{ type?: string; text?: string }> | undefined) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === 'string' ? part.text : undefined))
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
}

/**
 * OpenRouter-oriented inference adapter.
 *
 * Route handlers depend on the app-owned InferenceClient interface; this adapter
 * maps that shape to OpenRouter's chat completions API.
 */
export function createOpenRouterClient(config: OpenRouterProviderConfig): InferenceClient {
  return {
    provider: 'openrouter',
    async generate(request: InferenceRequest): Promise<InferenceResponse> {
      if (!config.apiKey) {
        throw new Error('OPENROUTER_API_KEY is required before calling OpenRouter inference.');
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': config.appName || 'interactive-business-card',
        },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages.map((message) => ({ role: message.role, content: message.content })),
          temperature: request.generation?.temperature,
          max_tokens: request.generation?.maxOutputTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as OpenRouterResponse;
      const content = extractContent(payload.choices?.[0]?.message?.content);

      if (!content) {
        throw new Error('OpenRouter response did not include assistant content.');
      }

      return {
        provider: 'openrouter',
        model: payload.model || config.model,
        message: {
          id: randomUUID(),
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
        },
      };
    },
  };
}
