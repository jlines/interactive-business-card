export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

export type TokenStatus = 'active' | 'revoked' | 'expired';

export type TokenRecord = {
  id: string;
  label: string;
  audienceHint?: string;
  customOpener?: string;
  notes?: string;
  status: TokenStatus;
};

export type TokenValidationResult =
  | { valid: true; record: TokenRecord }
  | { valid: false };
