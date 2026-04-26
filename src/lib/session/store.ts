import { createSessionPersistenceStore, createTokenStore, type SessionPersistenceStore, type TokenStore } from '@/lib/db/client';
import type { ChatMessage, ChatSessionAccess, ChatSessionState, TokenRecord } from '@/types/chat';

export type CreateSessionInput = {
  tokenId: string;
};

export interface ChatSessionStore {
  /** Create a session only after the caller has validated the QR token. */
  createForToken(input: CreateSessionInput): Promise<ChatSessionState>;
  /** Resolve a session for /api/chat. Unknown or closed sessions must fail closed. */
  authorize(sessionId: string): Promise<ChatSessionAccess>;
  appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void>;
  readMessages(sessionId: string): Promise<ChatMessage[]>;
}

function tokenIsActive(record: TokenRecord, now = new Date()) {
  if (record.status !== 'active') {
    return false;
  }

  if (record.revokedAt) {
    return false;
  }

  if (record.expiresAt && new Date(record.expiresAt) <= now) {
    return false;
  }

  return true;
}

export class DurableChatSessionStore implements ChatSessionStore {
  constructor(
    private readonly sessions: SessionPersistenceStore = createSessionPersistenceStore(),
    private readonly tokens: TokenStore = createTokenStore(),
  ) {}

  async createForToken(input: CreateSessionInput): Promise<ChatSessionState> {
    const session = await this.sessions.createSession({ tokenId: input.tokenId });
    return { ...session, messages: [] };
  }

  async authorize(sessionId: string): Promise<ChatSessionAccess> {
    const normalizedSessionId = sessionId.trim();

    if (!normalizedSessionId) {
      return { authorized: false, reason: 'missing_session' };
    }

    const session = await this.sessions.getSession(normalizedSessionId);

    if (!session) {
      return { authorized: false, reason: 'unknown_session' };
    }

    if (session.status !== 'active') {
      return { authorized: false, reason: 'closed_session' };
    }

    const tokenRecord = await this.tokens.getById(session.tokenId);

    if (!tokenRecord || !tokenIsActive(tokenRecord)) {
      return { authorized: false, reason: 'token_not_active' };
    }

    const messages = await this.sessions.readMessages(normalizedSessionId);
    await this.sessions.updateSessionLastSeen(normalizedSessionId, new Date().toISOString());

    return {
      authorized: true,
      session: { ...session, messages },
      tokenRecord,
    };
  }

  async appendMessages(sessionId: string, messages: ChatMessage[]): Promise<void> {
    await this.sessions.appendMessages(sessionId, messages);
  }

  async readMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.sessions.readMessages(sessionId);
  }
}

/** Creates a token-backed chat session after token validation. */
export async function createSession(tokenId: string): Promise<ChatSessionState> {
  return createChatSessionStore().createForToken({ tokenId });
}

export function createChatSessionStore(): ChatSessionStore {
  return new DurableChatSessionStore();
}
