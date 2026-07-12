export default function DailiesPage() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100dvh', padding: 32, textAlign: 'center',
      paddingBottom: 'var(--nav-height)',
    }}>
      <div style={{
        fontFamily: "'Noto Sans JP', sans-serif",
        fontSize: '3.5rem', marginBottom: 16, opacity: 0.25,
      }}>日</div>
      <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Dailies скоро появятся</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6 }}>
        Здесь будет система ежедневного повторения
      </p>
    </div>
  );
}
