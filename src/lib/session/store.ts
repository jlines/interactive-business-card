import type { ChatMessage, ChatSessionAccess, ChatSessionState } from '@/types/chat';

export type CreateSessionInput = {
  tokenId: string;
};

export interface ChatSessionStore {
  /** Create a session only after the caller has validated the QR token. */
  createForToken(input: CreateSessionInput): Promise<ChatSessionState>;
  /** Resolve a session for /api/chat. Unknown or closed sessions must fail closed. */
  authorize(sessionId: string): Promise<ChatSessionAccess>;
  appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void>;
}

/**
 * Creates a token-backed chat session.
 *
 * This placeholder preserves the security boundary: sessions are created from a
 * token id after validation, never directly from a chat request.
 */
export async function createSession(_tokenId: string): Promise<ChatSessionState> {
  throw new Error('TODO: create a durable session record after token validation.');
}

export function createChatSessionStore(): ChatSessionStore {
  throw new Error('TODO: implement local session persistence and authorization.');
}
