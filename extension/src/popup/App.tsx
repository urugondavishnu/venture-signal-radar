import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { TabBar } from '../components/TabBar';
import { StoreCompaniesTab } from '../tabs/StoreCompaniesTab';
import { ActiveRunsTab } from '../tabs/ActiveRunsTab';
import { ReportsTab } from '../tabs/ReportsTab';
import { SettingsTab } from '../tabs/SettingsTab';
import { OnboardingModal } from '../components/OnboardingModal';
import { getUserSettings } from '../api/client';
import '../styles/global.css';

export type TabId = 'store' | 'active-runs' | 'reports' | 'settings';

export interface ActiveRun {
  companyId: string;
  companyName: string;
  agents: AgentState[];
  isComplete: boolean;
  liveReport: ReportData | null;
  emailSent?: boolean;
}

export interface AgentState {
  agentId: string;
  agentType: string;
  agentName: string;
  status: 'connecting' | 'browsing' | 'analyzing' | 'complete' | 'error';
  message?: string;
  streamingUrl?: string;
  findings?: { signals: Array<{ signal_type: string; title: string; summary: string; source: string }> };
  error?: string;
}

export interface ReportData {
  company_overview: string;
  product_launches: ReportSignal[];
  financings: ReportSignal[];
  leadership_changes: ReportSignal[];
  revenue_milestones: ReportSignal[];
  customer_wins: ReportSignal[];
  pricing_updates: ReportSignal[];
  hiring_trends: ReportSignal[];
  general_news: ReportSignal[];
  founder_contacts: ReportSignal[];
  leading_indicators: ReportSignal[];
  competitive_landscape: ReportSignal[];
  fundraising_signals: ReportSignal[];
}

export interface ReportSignal {
  title: string;
  summary: string;
  source: string;
  url?: string;
  detected_at: string;
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('store');
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Load user settings — cache first, then refresh from API
  useEffect(() => {
    // Load from cache first
    try {
      chrome.storage.local.get('cachedSettings', (result) => {
        if (result.cachedSettings?.email) {
          setUserEmail(result.cachedSettings.email);
        } else {
          setShowOnboarding(true);
        }
      });
    } catch {
      setShowOnboarding(true);
    }

    // Then refresh from API
    getUserSettings().then((settings) => {
      if (settings.email) {
        setUserEmail(settings.email);
        setShowOnboarding(false);
      }
      try { chrome.storage.local.set({ cachedSettings: settings }); } catch {}
    }).catch(() => {});
  }, []);

  // Load activeRuns from chrome.storage.local and listen for changes from service worker
  useEffect(() => {
    try {
      chrome.storage.local.get('activeRuns', (result) => {
        if (result.activeRuns?.length) {
          setActiveRuns(result.activeRuns);
        }
      });
    } catch {
      // Not in extension context
    }

    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.activeRuns) {
        setActiveRuns(changes.activeRuns.newValue || []);
      }
    };

    try {
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    } catch {
      // Not in extension context
      return;
    }
  }, []);

  // Start a run via service worker message
  const startRun = useCallback((companyId: string, companyName: string) => {
    try {
      chrome.runtime.sendMessage({
        type: 'START_RUN',
        companyId,
        companyName,
      });
    } catch {
      // Not in extension context
    }
    setActiveTab('active-runs');
  }, []);

  // Dismiss a completed run via service worker message
  const removeActiveRun = useCallback((companyId: string) => {
    try {
      chrome.runtime.sendMessage({
        type: 'DISMISS_RUN',
        companyId,
      });
    } catch {
      // Not in extension context — update local state
      setActiveRuns((prev) => prev.filter((r) => r.companyId !== companyId));
    }
  }, []);

  return (
    <div className="app">
      <Header />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} activeRunCount={activeRuns.filter(r => !r.isComplete).length} />
      <div className="tab-content">
        {activeTab === 'store' && (
          <StoreCompaniesTab
            onStartRun={startRun}
            activeRuns={activeRuns}
          />
        )}
        {activeTab === 'active-runs' && (
          <ActiveRunsTab
            activeRuns={activeRuns}
            onDismiss={removeActiveRun}
          />
        )}
        {activeTab === 'reports' && <ReportsTab activeRuns={activeRuns} />}
        {activeTab === 'settings' && (
          <SettingsTab
            userEmail={userEmail}
            onEmailChange={setUserEmail}
          />
        )}
      </div>
      {showOnboarding && (
        <OnboardingModal
          onComplete={(email) => {
            setUserEmail(email);
            setShowOnboarding(false);
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}
