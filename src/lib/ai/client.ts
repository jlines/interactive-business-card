import { buildGroundedReply, getLatestUserMessage } from '@/lib/ai/grounded-reply';
import { sendBedrockChat } from '@/lib/ai/bedrock';
import { getProviderRuntimeConfig } from '@/lib/ai/runtime-config';
import type { ChatMessage, TokenRecord } from '@/types/chat';

type BedrockTestClient = {
  send(command: unknown): Promise<Record<string, unknown>>;
};

let bedrockClientForTests: BedrockTestClient | null = null;

export type ProviderName = 'openrouter' | 'bedrock';

export type PromptBundle = {
  systemPrompt: string;
  businessContext: string;
  personalizationNotes: string;
  tokenContext: TokenRecord;
  messages: ChatMessage[];
};

export async function sendChatToProvider(promptBundle: PromptBundle) {
  const runtimeConfig = getProviderRuntimeConfig(process.env);

  if (runtimeConfig.provider === 'openrouter' && runtimeConfig.canCallProvider && runtimeConfig.openRouterApiKey) {
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

      if (response.ok) {
        const payload = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = payload.choices?.[0]?.message?.content?.trim();
        if (content) {
          return content;
        }
      }
    } catch {
      // Fall through to grounded local reply.
    }
  }

  if (runtimeConfig.provider === 'bedrock' && runtimeConfig.canCallProvider) {
    try {
      return await sendBedrockChat({
        promptBundle,
        runtimeConfig,
        client: bedrockClientForTests ?? undefined,
      });
    } catch {
      // Fall through to grounded local reply.
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
