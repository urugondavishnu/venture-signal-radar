import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { TabBar, TabId } from './components/TabBar';
import { EmailSetup } from './components/EmailSetup';
import { CompaniesTab } from './components/CompaniesTab';
import { ActiveRunsTab } from './components/ActiveRunsTab';
import { ReportsTab } from './components/ReportsTab';
import { SettingsTab } from './components/SettingsTab';
import {
  Company,
  ActiveRun,
  AgentState,
  ReportData,
  getCompanies,
  getUserSettings,
  runAgentsSSE,
} from './api/client';

// ---------- localStorage persistence ----------

const STORAGE_KEYS = {
  email: 'vsr_email',
  activeRuns: 'vsr_active_runs',
  activeTab: 'vsr_active_tab',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- App ----------

export function App() {
  const [email, setEmail] = useState<string | null>(() => loadFromStorage(STORAGE_KEYS.email, null));
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>(() =>
    loadFromStorage(STORAGE_KEYS.activeRuns, []),
  );
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    loadFromStorage(STORAGE_KEYS.activeTab, 'companies') as TabId,
  );
  const [reportReload, setReportReload] = useState(0);
  const [loading, setLoading] = useState(true);

  // Ref for latest activeRuns (avoids stale closures in SSE callbacks)
  const activeRunsRef = useRef(activeRuns);
  activeRunsRef.current = activeRuns;

  // Persist to localStorage on change
  useEffect(() => saveToStorage(STORAGE_KEYS.activeRuns, activeRuns), [activeRuns]);
  useEffect(() => saveToStorage(STORAGE_KEYS.activeTab, activeTab), [activeTab]);
  useEffect(() => { if (email) saveToStorage(STORAGE_KEYS.email, email); }, [email]);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      try {
        const [companiesData, settings] = await Promise.all([
          getCompanies(),
          getUserSettings(),
        ]);
        setCompanies(companiesData);
        if (settings.email) setEmail(settings.email);
      } catch {
        // offline or first load
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch { /* ignore */ }
  }, []);

  // ---------- Run agents for a company ----------

  const handleRunCompany = useCallback((company: Company) => {
    // Skip if already running
    if (activeRunsRef.current.some((r) => r.companyId === company.company_id && !r.isComplete)) return;

    // Create new run entry
    const newRun: ActiveRun = {
      companyId: company.company_id,
      companyName: company.company_name,
      agents: [],
      isComplete: false,
      liveReport: null,
      startedAt: Date.now(),
    };

    setActiveRuns((prev) => [...prev, newRun]);
    setActiveTab('active-runs');

    // Start SSE stream
    runAgentsSSE(
      company.company_id,
      (event) => {
        const { type, data } = event;

        switch (type) {
          case 'agent_connecting':
          case 'agent_browsing':
          case 'agent_streaming_url':
          case 'agent_status':
          case 'agent_complete':
          case 'agent_error': {
            const agentData = data as unknown as AgentState;
            setActiveRuns((prev) =>
              prev.map((r) => {
                if (r.companyId !== company.company_id) return r;
                const idx = r.agents.findIndex((a) => a.agentId === agentData.agentId);
                const agents =
                  idx >= 0
                    ? r.agents.map((a) => (a.agentId === agentData.agentId ? { ...a, ...agentData } : a))
                    : [...r.agents, agentData];
                return { ...r, agents };
              }),
            );
            break;
          }
          case 'report_generated':
            setActiveRuns((prev) =>
              prev.map((r) =>
                r.companyId === company.company_id
                  ? { ...r, liveReport: (data as { report_data: ReportData }).report_data }
                  : r,
              ),
            );
            break;
          case 'email_sent':
            setActiveRuns((prev) =>
              prev.map((r) =>
                r.companyId === company.company_id
                  ? { ...r, emailSent: (data as { success: boolean }).success }
                  : r,
              ),
            );
            break;
          case 'pipeline_complete':
            setActiveRuns((prev) =>
              prev.map((r) =>
                r.companyId === company.company_id ? { ...r, isComplete: true } : r,
              ),
            );
            setReportReload((n) => n + 1);
            break;
        }
      },
      () => {
        // SSE stream ended — force complete if not already
        setActiveRuns((prev) =>
          prev.map((r) => {
            if (r.companyId !== company.company_id || r.isComplete) return r;
            const agents = r.agents.map((a) =>
              a.status !== 'complete' && a.status !== 'error'
                ? { ...a, status: 'complete' as const, findings: { signals: [] }, message: '0 results found' }
                : a,
            );
            return { ...r, agents, isComplete: true };
          }),
        );
        setReportReload((n) => n + 1);
      },
      (err) => {
        console.error('Agent run error:', err);
        setActiveRuns((prev) =>
          prev.map((r) =>
            r.companyId === company.company_id ? { ...r, isComplete: true } : r,
          ),
        );
      },
    );
  }, []);

  const handleDismissRun = useCallback((companyId: string) => {
    setActiveRuns((prev) => prev.filter((r) => r.companyId !== companyId));
  }, []);

  const handleEmailSetup = useCallback((newEmail: string) => {
    setEmail(newEmail);
    saveToStorage(STORAGE_KEYS.email, newEmail);
  }, []);

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="app-loading">
        <span className="spinner" style={{ fontSize: 32 }}>&#8635;</span>
        <p>Loading...</p>
      </div>
    );
  }

  // Email setup gate
  if (!email) {
    return <EmailSetup onComplete={handleEmailSetup} />;
  }

  const incompleteRuns = activeRuns.filter((r) => !r.isComplete);

  return (
    <div className="app">
      <Header email={email} />
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeRunCount={incompleteRuns.length}
      />
      <main className="app-content">
        {activeTab === 'companies' && (
          <CompaniesTab
            companies={companies}
            onCompanyAdded={refreshCompanies}
            onRunCompany={handleRunCompany}
            activeRunIds={activeRuns.filter((r) => !r.isComplete).map((r) => r.companyId)}
          />
        )}
        {activeTab === 'active-runs' && (
          <ActiveRunsTab activeRuns={activeRuns} onDismiss={handleDismissRun} />
        )}
        {activeTab === 'reports' && <ReportsTab triggerReload={reportReload} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}
