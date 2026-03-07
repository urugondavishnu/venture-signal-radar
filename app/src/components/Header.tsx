interface HeaderProps {
  email: string | null;
  onSignOut: () => void;
}

export function Header({ email, onSignOut }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-icon">📡</span>
        <div>
          <h1 className="header-title">Venture Signal Radar</h1>
          <p className="header-subtitle">Startup Intelligence Platform</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {email && <span className="header-email">{email}</span>}
        <button className="btn btn-sm btn-secondary" onClick={onSignOut}>
          Logout
        </button>
      </div>
    </header>
  );
}
