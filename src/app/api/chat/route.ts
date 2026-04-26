import { randomUUID } from 'node:crypto';
import { createInferenceClient } from '@/lib/ai/client';
import { assembleProviderMessages, buildPromptBundle } from '@/lib/ai/prompt';
import { getInferenceProviderConfig } from '@/lib/config/env';
import { createChatSessionStore } from '@/lib/session/store';
import type { ChatMessage } from '@/types/chat';

async function readChatRequest(request: Request): Promise<{ sessionId?: string; messages: ChatMessage[] }> {
  try {
    const body = (await request.json()) as unknown;

    if (typeof body !== 'object' || body === null) {
      return { messages: [] };
    }

    const sessionId = (body as { sessionId?: unknown }).sessionId;
    const messages = (body as { messages?: unknown }).messages;

    return {
      sessionId: typeof sessionId === 'string' ? sessionId : undefined,
      messages: Array.isArray(messages) ? messages.filter(isSafeUserMessage) : [],
    };
  } catch {
    return { messages: [] };
  }
}

function isSafeUserMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ChatMessage>;
  return candidate.role === 'user' && typeof candidate.content === 'string' && candidate.content.trim().length > 0;
}

function buildUserMessage(message: ChatMessage): ChatMessage {
  return {
    id: randomUUID(),
    role: 'user',
    content: message.content.trim(),
    createdAt: new Date().toISOString(),
  };
}

function normalizeAssistantMessage(message: ChatMessage): ChatMessage {
  return {
    id: message.id || randomUUID(),
    role: 'assistant',
    content: message.content,
    createdAt: message.createdAt || new Date().toISOString(),
  };
}

/**
 * Token-gated chat turn endpoint.
 *
 * This route is intentionally not an open public assistant. Every model call
 * first resolves the supplied session id to a live session that was created by
 * /api/session from a valid QR token.
 */
export async function POST(request: Request) {
  const { sessionId, messages } = await readChatRequest(request);

  if (!sessionId) {
    return Response.json({ ok: false, message: 'A valid session is required.' }, { status: 401 });
  }

  const store = createChatSessionStore();
  const access = await store.authorize(sessionId);

  if (!access.authorized) {
    return Response.json({ ok: false, message: 'A valid session is required.' }, { status: 401 });
  }

  const userMessage = messages.at(-1);

  if (!userMessage) {
    return Response.json({ ok: false, message: 'A user message is required.' }, { status: 400 });
  }

  try {
    const persistedUserMessage = buildUserMessage(userMessage);
    const promptBundle = await buildPromptBundle(access.tokenRecord, [...access.session.messages, persistedUserMessage]);
    const providerMessages = assembleProviderMessages(promptBundle);
    const client = createInferenceClient(getInferenceProviderConfig());
    const response = await client.generate({ messages: providerMessages });
    const assistantMessage = normalizeAssistantMessage(response.message);

    await store.appendMessages(access.session.id, [persistedUserMessage, assistantMessage]);

    return Response.json({
      ok: true,
      sessionId: access.session.id,
      message: assistantMessage,
    });
  } catch {
    return Response.json({ ok: false, message: 'The chat service is unavailable.' }, { status: 502 });
  }
}
