import { TabId } from '../popup/App';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeRunCount: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'store', label: 'Companies' },
  { id: 'active-runs', label: 'Active Runs' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

export function TabBar({ activeTab, onTabChange, activeRunCount }: TabBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        padding: '0 8px',
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            padding: '10px 8px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 12,
            fontWeight: activeTab === tab.id ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {tab.label}
          {tab.id === 'active-runs' && activeRunCount > 0 && (
            <span
              style={{
                background: 'var(--accent)',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
                minWidth: 18,
                textAlign: 'center',
              }}
            >
              {activeRunCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
