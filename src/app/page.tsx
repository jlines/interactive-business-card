export default function HomePage() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: 720 }}>
        <h1>Interactive Business Card</h1>
        <p>
          This app is intended to be entered through a QR token route. Use a valid tokenized URL
          at <code>/c/&lt;token&gt;</code>.
        </p>
      </div>
    </main>
  );
}
