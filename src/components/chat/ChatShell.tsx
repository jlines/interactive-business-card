'use client';

import { useMemo, useState } from 'react';

import type { ChatMessage, TokenRecord } from '@/types/chat';
import { Composer } from './Composer';
import { MessageList } from './MessageList';

export function ChatShell({
  initialMessages,
  sessionId,
  tokenRecord,
}: {
  initialMessages: ChatMessage[];
  sessionId: string;
  tokenRecord: TokenRecord;
}) {
  const opener = useMemo(() => initialMessages[0]?.content ?? '', [initialMessages]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(message: string) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, message }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? 'Unable to continue the chat.');
      }

      setMessages(payload.messages);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to continue the chat.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section style={{ border: '1px solid var(--panel-border)', borderRadius: 16, background: 'var(--panel)', padding: 20 }}>
      <header style={{ marginBottom: 16 }}>
        <p style={{ color: 'var(--muted)', margin: 0 }}>Entry: {tokenRecord.label}</p>
        <h2 style={{ margin: '0.35rem 0' }}>Start here</h2>
        <p style={{ margin: 0 }}>{opener}</p>
      </header>
      <MessageList messages={messages} />
      {error ? <p style={{ color: '#fca5a5', marginTop: 12 }}>{error}</p> : null}
      <Composer disabled={pending} onSend={handleSend} />
    </section>
  );
}
