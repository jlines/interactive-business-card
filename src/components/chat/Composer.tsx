export function Composer() {
  return (
    <form style={{ display: 'grid', gap: 12, marginTop: 20 }}>
      <textarea
        name="message"
        placeholder="Tell me about your project or workflow."
        rows={4}
        style={{ width: '100%', borderRadius: 12, border: '1px solid var(--panel-border)', background: '#0e1528', color: 'var(--text)', padding: 12 }}
      />
      <button type="submit" style={{ width: 'fit-content', borderRadius: 999, padding: '0.7rem 1rem', border: 0, background: 'linear-gradient(90deg, var(--accent), var(--accent-2))', color: '#08101f', fontWeight: 700 }}>
        Send
      </button>
    </form>
  );
}
