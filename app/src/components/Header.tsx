interface HeaderProps {
  email: string | null;
}

export function Header({ email }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <span className="header-icon">📡</span>
        <div>
          <h1 className="header-title">Venture Signal Radar</h1>
          <p className="header-subtitle">Startup Intelligence Platform</p>
        </div>
      </div>
      {email && <span className="header-email">{email}</span>}
    </header>
  );
}
