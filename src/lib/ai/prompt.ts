import { loadBusinessContext, loadSystemPrompt, loadTokenPersonalizationNotes } from '@/lib/context/loaders';
import type { ChatMessage, TokenRecord } from '@/types/chat';

export async function buildPromptBundle(tokenRecord: TokenRecord, messages: ChatMessage[]) {
  const [systemPrompt, businessContext, personalizationNotes] = await Promise.all([
    loadSystemPrompt(),
    loadBusinessContext(),
    loadTokenPersonalizationNotes(),
  ]);

  return {
    systemPrompt,
    businessContext,
    personalizationNotes,
    tokenContext: tokenRecord,
    messages,
  };
}
