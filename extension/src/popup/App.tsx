import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/Header';
import { TabBar, TabId } from '../components/TabBar';
import { CompaniesTab } from '../tabs/StoreCompaniesTab';
import { ActiveRunsTab } from '../tabs/ActiveRunsTab';
import { ReportsTab } from '../tabs/ReportsTab';
import { SettingsTab } from '../tabs/SettingsTab';
import { useAuth } from '../auth/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { SignUpPage } from '../auth/SignUpPage';
import {
  Company,
  ActiveRun,
  AgentState,
  ReportData,
  getCompanies,
  getReports,
  runAgentsSSE,
  stopRun,
} from '../api/client';
import '../styles/global.css';

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

const MAX_CONCURRENT_RUNS = 2;

interface QueueEntry {
  company: Company;
}

export function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>(() =>
    loadFromStorage('vsr_active_runs', []),
  );
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    loadFromStorage('vsr_active_tab', 'companies') as TabId,
  );
  const [reportReload, setReportReload] = useState(0);
  const [loading, setLoading] = useState(true);

  const activeRunsRef = useRef(activeRuns);
  activeRunsRef.current = activeRuns;
  const runQueueRef = useRef<QueueEntry[]>([]);
  const runningCountRef = useRef(0);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => saveToStorage('vsr_active_runs', activeRuns), [activeRuns]);
  useEffect(() => saveToStorage('vsr_active_tab', activeTab), [activeTab]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const init = async () => {
      try {
        const companiesData = await getCompanies();
        setCompanies(companiesData);
      } catch { /* offline */ } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  // Reconcile stale active runs — poll every 30s until all incomplete runs have reports
  useEffect(() => {
    if (!user) return;

    const reconcile = async () => {
      const incompleteRuns = activeRunsRef.current.filter((r) => !r.isComplete && !abortControllersRef.current.has(r.companyId));
      if (incompleteRuns.length === 0) return;

      let changed = false;
      const updated = [...activeRunsRef.current];

      for (const run of incompleteRuns) {
        try {
          const reports = await getReports(run.companyId);
          const matchingReport = reports.find(
            (r) => new Date(r.generated_at).getTime() > run.startedAt,
          );
          if (matchingReport) {
            const idx = updated.findIndex((r) => r.companyId === run.companyId);
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                isComplete: true,
                queued: false,
                liveReport: matchingReport.report_data,
                agents: updated[idx].agents.map((a) =>
                  a.status !== 'complete' && a.status !== 'error'
                    ? { ...a, status: 'complete' as const, findings: { signals: [] }, message: 'Completed while panel was closed' }
                    : a,
                ),
              };
              changed = true;
            }
          }
        } catch { /* ignore per-company errors */ }
      }

      if (changed) {
        setActiveRuns(updated);
        setReportReload((n) => n + 1);
      }
    };

    // Run immediately on mount, then poll every 30s
    reconcile();
    const interval = setInterval(reconcile, 30_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshCompanies = useCallback(async () => {
    try { const data = await getCompanies(); setCompanies(data); } catch { /* ignore */ }
  }, []);

  const processQueue = useCallback(() => {
    while (runningCountRef.current < MAX_CONCURRENT_RUNS && runQueueRef.current.length > 0) {
      const next = runQueueRef.current.shift()!;
      executeRun(next.company);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const executeRun = useCallback((company: Company) => {
    runningCountRef.current++;
    setActiveRuns((prev) =>
      prev.map((r) => r.companyId === company.company_id ? { ...r, queued: false, startedAt: Date.now() } : r),
    );

    let completedViaEvent = false;
    const onRunComplete = () => {
      if (completedViaEvent) return;
      completedViaEvent = true;
      runningCountRef.current--;
      processQueue();
    };

    const controller = runAgentsSSE(
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
                const agents = idx >= 0
                  ? r.agents.map((a) => (a.agentId === agentData.agentId ? { ...a, ...agentData } : a))
                  : [...r.agents, agentData];
                return { ...r, agents };
              }),
            );
            break;
          }
          case 'report_generated':
            setActiveRuns((prev) =>
              prev.map((r) => r.companyId === company.company_id
                ? { ...r, liveReport: (data as { report_data: ReportData }).report_data } : r),
            );
            break;
          case 'email_sent':
            setActiveRuns((prev) =>
              prev.map((r) => r.companyId === company.company_id
                ? { ...r, emailSent: (data as { success: boolean }).success } : r),
            );
            break;
          case 'pipeline_complete':
            abortControllersRef.current.delete(company.company_id);
            setActiveRuns((prev) =>
              prev.map((r) => r.companyId === company.company_id ? { ...r, isComplete: true } : r),
            );
            setReportReload((n) => n + 1);
            onRunComplete();
            break;
        }
      },
      () => {
        abortControllersRef.current.delete(company.company_id);
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
        onRunComplete();
      },
      (err) => {
        console.error('Agent run error:', err);
        abortControllersRef.current.delete(company.company_id);
        setActiveRuns((prev) =>
          prev.map((r) => r.companyId === company.company_id ? { ...r, isComplete: true } : r),
        );
        onRunComplete();
      },
    );

    abortControllersRef.current.set(company.company_id, controller);
  }, [processQueue]);

  const handleRunCompany = useCallback((company: Company) => {
    if (activeRunsRef.current.some((r) => r.companyId === company.company_id && !r.isComplete)) return;
    if (runQueueRef.current.some((q) => q.company.company_id === company.company_id)) return;

    const willRunImmediately = runningCountRef.current < MAX_CONCURRENT_RUNS;
    const newRun: ActiveRun = {
      companyId: company.company_id,
      companyName: company.company_name,
      agents: [],
      isComplete: false,
      liveReport: null,
      startedAt: Date.now(),
      queued: !willRunImmediately,
    };

    setActiveRuns((prev) => [...prev, newRun]);
    setActiveTab('active-runs');

    if (willRunImmediately) {
      executeRun(company);
    } else {
      runQueueRef.current.push({ company });
    }
  }, [executeRun]);

  const handleStopRun = useCallback(async (companyId: string) => {
    const controller = abortControllersRef.current.get(companyId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(companyId);
    }

    const run = activeRunsRef.current.find((r) => r.companyId === companyId);
    const findings = (run?.agents || [])
      .filter((a) => a.status === 'complete' && a.findings?.signals)
      .flatMap((a) => a.findings!.signals);

    setActiveRuns((prev) =>
      prev.map((r) =>
        r.companyId === companyId ? { ...r, isComplete: true } : r,
      ),
    );
    runningCountRef.current--;
    processQueue();

    try {
      const result = await stopRun(companyId, findings);
      setActiveRuns((prev) =>
        prev.map((r) =>
          r.companyId === companyId
            ? { ...r, liveReport: result.report_data, emailSent: result.email_sent }
            : r,
        ),
      );
      setReportReload((n) => n + 1);
    } catch (err) {
      console.error('Stop run failed:', err);
    }
  }, [processQueue]);

  const handleRemoveQueued = useCallback((companyId: string) => {
    runQueueRef.current = runQueueRef.current.filter((q) => q.company.company_id !== companyId);
    setActiveRuns((prev) => prev.filter((r) => r.companyId !== companyId));
  }, []);

  const handleDismissRun = useCallback((companyId: string) => {
    runQueueRef.current = runQueueRef.current.filter((q) => q.company.company_id !== companyId);
    setActiveRuns((prev) => prev.filter((r) => r.companyId !== companyId));
  }, []);

  if (authLoading) {
    return (
      <div className="app-loading">
        <span className="spinner" style={{ fontSize: 32 }}>&#8635;</span>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    if (authPage === 'signup') {
      return <SignUpPage onSwitchToLogin={() => setAuthPage('login')} />;
    }
    return <LoginPage onSwitchToSignUp={() => setAuthPage('signup')} />;
  }

  if (loading) {
    return (
      <div className="app-loading">
        <span className="spinner" style={{ fontSize: 32 }}>&#8635;</span>
        <p>Loading...</p>
      </div>
    );
  }

  const incompleteRuns = activeRuns.filter((r) => !r.isComplete);

  return (
    <div className="app">
      <Header email={user.email || null} onSignOut={signOut} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} activeRunCount={incompleteRuns.length} />
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
          <ActiveRunsTab
            activeRuns={activeRuns}
            onDismiss={handleDismissRun}
            onStop={handleStopRun}
            onRemoveQueued={handleRemoveQueued}
          />
        )}
        {activeTab === 'reports' && <ReportsTab triggerReload={reportReload} />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}
