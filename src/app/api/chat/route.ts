import { sendChatRequestSchema } from '@/lib/contracts/chat';
import { sendChatTurn } from '@/lib/chat/service';
import type { ApiError, SendChatResponse } from '@/types/api';

const invalidRequestResponse: ApiError = {
  ok: false,
  message: 'Expected a sessionId and message.',
};

const unauthorizedResponse: ApiError = {
  ok: false,
  message: 'A valid session is required.',
};

const unavailableResponse: ApiError = {
  ok: false,
  message: 'The chat service is unavailable.',
};

async function parseJsonSafely(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isAuthorizationFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return /unknown session|valid session is required/i.test(error.message);
}

export async function POST(request: Request) {
  const payload = await parseJsonSafely(request);

  if (payload === null) {
    return Response.json(invalidRequestResponse, { status: 400 });
  }

  const parsed = sendChatRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return Response.json(invalidRequestResponse, { status: 400 });
  }

  const message = parsed.data.message.trim();

  if (!message) {
    return Response.json(invalidRequestResponse, { status: 400 });
  }

  try {
    const result = await sendChatTurn({
      sessionId: parsed.data.sessionId,
      message,
    });

    const response: SendChatResponse = {
      ok: true,
      sessionId: result.session.id,
      message: result.assistantMessage,
      messages: result.session.messages,
    };

    return Response.json(response);
  } catch (error) {
    if (isAuthorizationFailure(error)) {
      return Response.json(unauthorizedResponse, { status: 401 });
    }

    return Response.json(unavailableResponse, { status: 502 });
  }
}
