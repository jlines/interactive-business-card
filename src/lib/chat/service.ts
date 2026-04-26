import { randomUUID } from 'node:crypto';

import { sendChatToProvider } from '@/lib/ai/client';
import { buildPromptBundle } from '@/lib/ai/prompt';
import { appendMessages, getSession } from '@/lib/session/store';
import type { ChatMessage } from '@/types/chat';

export async function sendChatTurn({ sessionId, message }: { sessionId: string; message: string }) {
  const session = await getSession(sessionId);

  if (!session) {
    throw new Error(`Unknown session: ${sessionId}`);
  }

  const userMessage: ChatMessage = {
    id: randomUUID(),
    role: 'user',
    content: message.trim(),
  };

  const sessionWithUser = await appendMessages(sessionId, [userMessage]);
  const promptBundle = await buildPromptBundle(session.tokenRecord, sessionWithUser.messages);
  const assistantContent = await sendChatToProvider(promptBundle);

  const assistantMessage: ChatMessage = {
    id: randomUUID(),
    role: 'assistant',
    content: assistantContent,
  };

  const updatedSession = await appendMessages(sessionId, [assistantMessage]);

  return {
    session: updatedSession,
    assistantMessage,
  };
}
