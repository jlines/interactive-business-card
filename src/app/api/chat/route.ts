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
      messages: Array.isArray(messages) ? (messages as ChatMessage[]) : [],
    };
  } catch {
    return { messages: [] };
  }
}

/**
 * Token-gated chat turn endpoint.
 *
 * This route is intentionally not an open public assistant. Every future model
 * call must first resolve the supplied session id to a live session that was
 * created by /api/session from a valid QR token.
 */
export async function POST(request: Request) {
  const { sessionId } = await readChatRequest(request);

  if (!sessionId) {
    return Response.json(
      { ok: false, message: 'A valid token-backed session is required.' },
      { status: 401 },
    );
  }

  return Response.json(
    {
      ok: false,
      message: 'Chat session authorization, prompt assembly, and provider inference are not implemented yet.',
      next: 'Resolve sessionId in src/lib/session/store.ts before calling src/lib/ai/prompt.ts and src/lib/ai/client.ts.',
    },
    { status: 501 },
  );
}
