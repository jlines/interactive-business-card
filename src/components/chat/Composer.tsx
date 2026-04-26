'use client';

import { useState } from 'react';

export function Composer({ disabled = false, onSend }: { disabled?: boolean; onSend: (message: string) => Promise<void> | void }) {
  const [message, setMessage] = useState('');

  return (
    <form
      style={{ display: 'grid', gap: 12, marginTop: 20 }}
      onSubmit={async (event) => {
        event.preventDefault();
        const nextMessage = message.trim();
        if (!nextMessage || disabled) {
          return;
        }

        await onSend(nextMessage);
        setMessage('');
      }}
    >
      <textarea
        name="message"
        placeholder="Tell me about your project or workflow."
        rows={4}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={disabled}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--panel-border)', background: '#0e1528', color: 'var(--text)', padding: 12 }}
      />
      <button type="submit" disabled={disabled} style={{ width: 'fit-content', borderRadius: 999, padding: '0.7rem 1rem', border: 0, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', color: '#08101f', fontWeight: 700, opacity: disabled ? 0.7 : 1 }}>
        {disabled ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
