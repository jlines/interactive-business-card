export type ChatRole = 'system' | 'user' | 'assistant';
export type TokenStatus = 'active' | 'revoked' | 'expired';
export type SessionStatus = 'active' | 'closed';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
};

export type TokenRecord = {
  id: string;
  label: string;
  audienceHint?: string;
  customOpener?: string;
  notes?: string;
  status: TokenStatus;
};

export type OpeningContext = {
  label: string;
  opener: string;
  audienceHint?: string;
};

export type ChatSession = {
  id: string;
  tokenId: string;
  status: SessionStatus;
  messages: ChatMessage[];
};

export type AuthFailureReason =
  | 'missing_session'
  | 'unknown_session'
  | 'closed_session'
  | 'token_not_active';
