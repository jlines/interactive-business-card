import { z } from 'zod';

import { sendChatTurn } from '@/lib/chat/service';

const sendChatSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  const parsed = sendChatSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ ok: false, message: 'Expected a sessionId and message.' }, { status: 400 });
  }

  try {
    const result = await sendChatTurn(parsed.data);

    return Response.json({
      ok: true,
      sessionId: result.session.id,
      message: result.assistantMessage,
      messages: result.session.messages,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to continue the chat.';
    const status = /unknown session/i.test(message) ? 404 : 500;

    return Response.json({ ok: false, message }, { status });
  }
}
