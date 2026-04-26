import type { ChatMessage, TokenRecord } from '@/types/chat';

export type ChatSession = {
  id: string;
  tokenId: string;
  tokenRecord: TokenRecord;
  messages: ChatMessage[];
};
