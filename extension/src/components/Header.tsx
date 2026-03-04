export function Header() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}
      >
        &#9672;
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
          Venture Signal Tracker
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
          Startup Intelligence Platform
        </div>
      </div>
    </div>
  );
}
