export type TabId = 'companies' | 'active-runs' | 'reports' | 'settings';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeRunCount: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'companies', label: 'Companies' },
  { id: 'active-runs', label: 'Active Runs' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

export function TabBar({ activeTab, onTabChange, activeRunCount }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.id === 'active-runs' && activeRunCount > 0 && (
            <span className="tab-badge">{activeRunCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
