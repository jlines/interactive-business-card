import type { ChatMessage } from '@/types/chat';

export type ProviderName = 'openrouter' | 'bedrock';

export async function sendChatToProvider(_messages: ChatMessage[]) {
  throw new Error('TODO: implement provider adapter for OpenRouter or Bedrock.');
}
