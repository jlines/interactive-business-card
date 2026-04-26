import type { ChatMessage } from '@/types/chat';

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {messages.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>Conversation messages will appear here.</p>
      ) : (
        messages.map((message) => (
          <article key={message.id} style={{ border: '1px solid var(--panel-border)', borderRadius: 12, padding: 12 }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>{message.role}</strong>
            <span>{message.content}</span>
          </article>
        ))
      )}
    </div>
  );
}
