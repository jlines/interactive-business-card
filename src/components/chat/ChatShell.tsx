'use client';

import { useState } from 'react';

import type { SendChatResponse } from '@/types/api';
import type { ChatMessage } from '@/types/chat';
import type { OpeningContext } from '@/types/domain';
import { Composer } from './Composer';
import { MessageList } from './MessageList';

export function ChatShell({
  initialMessages = [],
  sessionId,
  openingContext,
}: {
  initialMessages?: ChatMessage[];
  sessionId: string;
  openingContext: OpeningContext;
}) {
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

      const payload = (await response.json()) as SendChatResponse;

      if (!payload.ok) {
        throw new Error(payload.message);
      }

      if (!response.ok) {
        throw new Error('Unable to continue the chat.');
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
        <p style={{ color: 'var(--muted)', margin: 0 }}>Entry: {openingContext.label}</p>
        <h2 style={{ margin: '0.35rem 0' }}>Start here</h2>
        <p style={{ margin: 0 }}>{openingContext.opener}</p>
      </header>
      <MessageList messages={messages} />
      {error ? <p style={{ color: '#fca5a5', marginTop: 12 }}>{error}</p> : null}
      <Composer disabled={pending} onSend={handleSend} />
    </section>
  );
}
