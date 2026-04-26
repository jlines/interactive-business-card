import { buildGroundedReply, getLatestUserMessage } from '@/lib/ai/grounded-reply';
import { sendBedrockChat } from '@/lib/ai/bedrock';
import { getProviderRuntimeConfig } from '@/lib/ai/runtime-config';
import type { ChatMessage, TokenRecord } from '@/types/chat';

type BedrockTestClient = {
  send(command: unknown): Promise<Record<string, unknown>>;
};

let bedrockClientForTests: BedrockTestClient | null = null;

export type ProviderName = 'openrouter' | 'bedrock' | 'ollama';

export type PromptBundle = {
  systemPrompt: string;
  businessContext: string;
  personalizationNotes: string;
  tokenContext: TokenRecord;
  messages: ChatMessage[];
};

export async function sendChatToProvider(promptBundle: PromptBundle) {
  const runtimeConfig = getProviderRuntimeConfig(process.env);
  const failLoudly = process.env.NODE_ENV === 'development' || process.env.FAIL_LOUD_PROVIDER_ERRORS === 'true';

  if (runtimeConfig.provider === 'openrouter') {
    if (!runtimeConfig.canCallProvider || !runtimeConfig.openRouterApiKey) {
      if (failLoudly) {
        throw new Error('OpenRouter is selected but OPENROUTER_API_KEY is missing or empty.');
      }
    } else {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${runtimeConfig.openRouterApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: runtimeConfig.openRouterModel,
            messages: [
              {
                role: 'system',
                content: [
                  promptBundle.systemPrompt,
                  promptBundle.businessContext,
                  promptBundle.personalizationNotes,
                ].join('\n\n'),
              },
              ...promptBundle.messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`OpenRouter request failed with status ${response.status}${body ? `: ${body}` : ''}`);
        }

        const payload = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content?.trim();
        if (content) {
          return content;
        }

        throw new Error('OpenRouter returned no assistant content.');
      } catch (error) {
        if (failLoudly) {
          throw error;
        }
      }
    }
  }

  if (runtimeConfig.provider === 'bedrock') {
    if (!runtimeConfig.canCallProvider) {
      if (failLoudly) {
        throw new Error('Bedrock is selected but BEDROCK_REGION or BEDROCK_MODEL_ID is missing.');
      }
    } else {
      try {
        return await sendBedrockChat({
          promptBundle,
          runtimeConfig,
          client: bedrockClientForTests ?? undefined,
        });
      } catch (error) {
        if (failLoudly) {
          throw error;
        }
      }
    }
  }

  if (runtimeConfig.provider === 'ollama') {
    if (!runtimeConfig.canCallProvider || !runtimeConfig.ollamaBaseUrl || !runtimeConfig.ollamaModel) {
      if (failLoudly) {
        throw new Error('Ollama is selected but OLLAMA_BASE_URL or OLLAMA_MODEL is missing.');
      }
    } else {
      try {
        const response = await fetch(`${runtimeConfig.ollamaBaseUrl.replace(/\/$/, '')}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: runtimeConfig.ollamaModel,
            stream: false,
            messages: [
              {
                role: 'system',
                content: [
                  promptBundle.systemPrompt,
                  promptBundle.businessContext,
                  promptBundle.personalizationNotes,
                ].join('\n\n'),
              },
              ...promptBundle.messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`Ollama request failed with status ${response.status}${body ? `: ${body}` : ''}`);
        }

        const payload = await response.json() as {
          message?: {
            content?: string;
          };
        };

        const content = payload.message?.content?.trim();
        if (content) {
          return content;
        }

        throw new Error('Ollama returned no assistant content.');
      } catch (error) {
        if (failLoudly) {
          throw error;
        }
      }
    }
  }

  return buildGroundedReply({
    latestUserMessage: getLatestUserMessage(promptBundle.messages),
    audienceHint: promptBundle.tokenContext.audienceHint,
  });
}

export function setBedrockClientForTests(client: BedrockTestClient | null) {
  bedrockClientForTests = client;
}

export function resetProviderTestHooks() {
  bedrockClientForTests = null;
}
