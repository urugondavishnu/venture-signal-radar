export type TabId = 'companies' | 'active-runs' | 'reports' | 'settings';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeRunCount: number;
  email: string | null;
  onSignOut: () => void;
}

const NAV_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: 'companies', label: 'Companies', icon: '\u{1F3E2}' },
  { id: 'active-runs', label: 'Active Runs', icon: '\u{26A1}' },
  { id: 'reports', label: 'Reports', icon: '\u{1F4CB}' },
  { id: 'settings', label: 'Settings', icon: '\u{2699}' },
];

export function Sidebar({
  activeTab,
  onTabChange,
  activeRunCount,
  email,
  onSignOut,
}: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">Daily Delta</div>
          <div className="sidebar-subtitle">Startup Intelligence Brief</div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
              {item.id === 'active-runs' && activeRunCount > 0 && (
                <span className="sidebar-badge">{activeRunCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {email && <div className="sidebar-email">{email}</div>}
          <button className="sidebar-logout" onClick={onSignOut}>
            Sign Out
          </button>
          <a
            href="https://tinyfish.io"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-powered-by"
          >
            <span>Powered by</span>
            <img src="/images/tinyfish-logo.png" alt="TinyFish" />
          </a>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              {item.label.split(' ')[0]}
              {item.id === 'active-runs' && activeRunCount > 0 && (
                <span className="mobile-nav-badge">{activeRunCount}</span>
              )}
            </button>
          ))}
          <button
            className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => onTabChange('settings')}
          >
            <span className="mobile-nav-icon">&#9881;</span>
            Settings
          </button>
        </div>
      </nav>
    </>
  );
}

// Keep backward-compatible export for the type
export { Sidebar as TabBar };
