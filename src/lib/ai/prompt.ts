import { loadBusinessContextDocuments } from '@/lib/context/loaders';
import type { ChatMessage, TokenRecord } from '@/types/chat';

export type PromptLayerName =
  | 'base_system_instruction'
  | 'contracting_services_context'
  | 'token_personalization_policy'
  | 'token_personalization_context'
  | 'conversation_history';

export type PromptLayer = {
  name: PromptLayerName;
  source: 'context/system-prompt.md' | 'context/contracting-services.md' | 'context/token-personalization.md' | 'token-record' | 'session';
  required: boolean;
  content: string;
};

export type PromptBundle = {
  tokenRecord: TokenRecord;
  layers: PromptLayer[];
  messages: ChatMessage[];
};

function renderTokenContext(tokenRecord: TokenRecord) {
  return [
    `Token label: ${tokenRecord.label}`,
    tokenRecord.audienceHint ? `Audience hint: ${tokenRecord.audienceHint}` : undefined,
    tokenRecord.customOpener ? `Custom opener: ${tokenRecord.customOpener}` : undefined,
    tokenRecord.notes ? `Internal token notes: ${tokenRecord.notes}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderConversationHistory(messages: ChatMessage[]) {
  if (messages.length === 0) {
    return 'No prior conversation messages in this session.';
  }

  return messages.map((message) => `${message.role}: ${message.content}`).join('\n');
}

/**
 * Builds the layered prompt contract used by provider adapters.
 *
 * The order is intentional and should remain visible: base system instruction,
 * business context, personalization policy, token metadata, then conversation
 * history. Raw QR tokens do not belong in this bundle.
 */
export async function buildPromptBundle(tokenRecord: TokenRecord, messages: ChatMessage[]): Promise<PromptBundle> {
  const { systemPrompt, businessContext, tokenPersonalizationNotes } = await loadBusinessContextDocuments();

  return {
    tokenRecord,
    messages,
    layers: [
      {
        name: 'base_system_instruction',
        source: 'context/system-prompt.md',
        required: true,
        content: systemPrompt,
      },
      {
        name: 'contracting_services_context',
        source: 'context/contracting-services.md',
        required: true,
        content: businessContext,
      },
      {
        name: 'token_personalization_policy',
        source: 'context/token-personalization.md',
        required: true,
        content: tokenPersonalizationNotes,
      },
      {
        name: 'token_personalization_context',
        source: 'token-record',
        required: false,
        content: renderTokenContext(tokenRecord),
      },
      {
        name: 'conversation_history',
        source: 'session',
        required: false,
        content: renderConversationHistory(messages),
      },
    ],
  };
}

export function assembleProviderMessages(bundle: PromptBundle): ChatMessage[] {
  const systemContent = bundle.layers
    .filter((layer) => layer.name !== 'conversation_history')
    .map((layer) => `## ${layer.name}\n${layer.content}`)
    .join('\n\n');

  return [{ id: 'system-prompt', role: 'system', content: systemContent }, ...bundle.messages];
}
