import type { ChatMessage, OpeningContext } from './domain';

export type ApiError = { ok: false; message: string };

export type CreateSessionResponse =
  | { ok: true; sessionId: string; openingContext: OpeningContext }
  | ApiError;

export type SendChatResponse =
  | { ok: true; sessionId: string; message: ChatMessage; messages: ChatMessage[] }
  | ApiError;
