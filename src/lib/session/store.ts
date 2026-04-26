import type { ChatMessage } from '@/types/chat';

export type ChatSession = {
  id: string;
  tokenId: string;
  messages: ChatMessage[];
};

export async function createSession(_tokenId: string): Promise<ChatSession> {
  throw new Error('TODO: create a session record once token validation is implemented server-side.');
}
