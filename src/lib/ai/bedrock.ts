import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

import type { PromptBundle } from '@/lib/ai/client';
import type { ProviderRuntimeConfig } from '@/lib/ai/runtime-config';

type BedrockSendClient = {
  send(command: unknown): Promise<Record<string, unknown>>;
};

export async function sendBedrockChat({
  promptBundle,
  runtimeConfig,
  client,
}: {
  promptBundle: PromptBundle;
  runtimeConfig: ProviderRuntimeConfig;
  client?: BedrockSendClient;
}) {
  if (!runtimeConfig.bedrockRegion || !runtimeConfig.bedrockModelId) {
    throw new Error('Bedrock runtime config is incomplete.');
  }

  const bedrockClient = client ?? new BedrockRuntimeClient({ region: runtimeConfig.bedrockRegion });
  const systemPrompt = [
    promptBundle.systemPrompt,
    promptBundle.businessContext,
    promptBundle.personalizationNotes,
  ].join('\n\n');

  const response = await bedrockClient.send(new ConverseCommand({
    modelId: runtimeConfig.bedrockModelId,
    system: [{ text: systemPrompt }],
    messages: promptBundle.messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: [{ text: message.content }],
    })),
  }));

  const output = response.output as {
    message?: {
      content?: Array<{ text?: string }>;
    };
  } | undefined;
  const content = output?.message?.content
    ?.map((block) => block.text?.trim())
    .filter((value): value is string => Boolean(value))
    .join('\n')
    .trim();

  if (!content) {
    throw new Error('Bedrock returned no assistant text.');
  }

  return content;
}
