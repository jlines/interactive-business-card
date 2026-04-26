/**
 * Shared domain types for the interactive business card.
 *
 * These types intentionally describe the app's security and personalization
 * boundaries. The product is token-gated; it is not a public chat surface.
 */
export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
};

export type TokenStatus = 'active' | 'revoked' | 'expired';

/**
 * Human-authored metadata attached to a QR token.
 *
 * Personalization should steer the opening and prompt context only. It should
 * not be treated as proof of identity unless a later token lifecycle explicitly
 * encodes that relationship.
 */
export type TokenMetadata = {
  label: string;
  audienceHint?: string;
  customOpener?: string;
  notes?: string;
};

/**
 * Server-side token record. Persisted stores should keep token hashes, never raw
 * QR token values. UI and prompt code should consume only this safe metadata.
 */
export type TokenRecord = TokenMetadata & {
  id: string;
  tokenHash?: string;
  status: TokenStatus;
  createdAt?: string;
  expiresAt?: string;
  revokedAt?: string;
};

export type TokenValidationFailureReason = 'missing' | 'malformed' | 'not_found' | 'expired' | 'revoked';

/**
 * Token validation is fail-closed: only the explicit valid branch may open the
 * entry experience or create a chat session.
 */
export type TokenValidationResult =
  | { valid: true; record: TokenRecord }
  | { valid: false; reason: TokenValidationFailureReason; publicMessage: string };

/**
 * The personalized first impression derived from a valid token record.
 */
export type PersonalizedOpeningContext = {
  tokenId: string;
  label: string;
  audienceHint?: string;
  opener: string;
  notes?: string;
};

export type ChatSessionStatus = 'pending' | 'active' | 'closed';

/**
 * Minimal server-owned chat session state. A session is always backed by a
 * previously validated token record and should never be created from /api/chat.
 */
export type ChatSessionState = {
  id: string;
  tokenId: string;
  status: ChatSessionStatus;
  createdAt: string;
  lastSeenAt?: string;
  messages: ChatMessage[];
};

export type ChatSessionAccess =
  | { authorized: true; session: ChatSessionState; tokenRecord: TokenRecord }
  | { authorized: false; reason: 'missing_session' | 'unknown_session' | 'closed_session' | 'token_not_active' };

export type ChatTurnRequest = {
  sessionId: string;
  messages: ChatMessage[];
};

export type ChatTurnResponse = {
  sessionId: string;
  message: ChatMessage;
};
