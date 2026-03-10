import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, TabId } from './components/TabBar';
import { CompaniesTab } from './components/CompaniesTab';
import { ActiveRunsTab } from './components/ActiveRunsTab';
import { ReportsTab } from './components/ReportsTab';
import { SettingsTab } from './components/SettingsTab';
import { useAuth } from './auth/AuthContext';
import { LoginPage } from './auth/LoginPage';
import { SignUpPage } from './auth/SignUpPage';
import {
  Company,
  ActiveRun,
  AgentState,
  ReportData,
  getCompanies,
  runAgentsSSE,
  stopRun,
} from './api/client';

// ---------- localStorage persistence ----------

const STORAGE_KEYS = {
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

// ---------- Concurrency-limited run queue (max 2 at a time) ----------

const MAX_CONCURRENT_RUNS = 2;

interface QueueEntry {
  company: Company;
}

// ---------- App ----------

export function App() {
  const { user, loading: authLoading, configError, signOut } = useAuth();
  const [authPage, setAuthPage] = useState<'login' | 'signup'>('login');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>(() =>
    loadFromStorage(STORAGE_KEYS.activeRuns, []),
  );
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    loadFromStorage(STORAGE_KEYS.activeTab, 'companies') as TabId,
  );
  const [reportReload, setReportReload] = useState(0);
  const [loading, setLoading] = useState(true);

  // Refs for queue management (avoids stale closures in SSE callbacks)
  const activeRunsRef = useRef(activeRuns);
  activeRunsRef.current = activeRuns;

  const runQueueRef = useRef<QueueEntry[]>([]);
  const runningCountRef = useRef(0);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Persist to localStorage on change
  useEffect(() => saveToStorage(STORAGE_KEYS.activeRuns, activeRuns), [activeRuns]);
  useEffect(() => saveToStorage(STORAGE_KEYS.activeTab, activeTab), [activeTab]);

  // Load initial data when authenticated
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const init = async () => {
      try {
        const companiesData = await getCompanies();
        setCompanies(companiesData);
      } catch {
        // offline or first load
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const refreshCompanies = useCallback(async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch { /* ignore */ }
  }, []);

  // ---------- Process queue: launch next company if slot available ----------

  const processQueue = useCallback(() => {
    while (runningCountRef.current < MAX_CONCURRENT_RUNS && runQueueRef.current.length > 0) {
      const next = runQueueRef.current.shift()!;
      executeRun(next.company);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Execute a single company run (SSE stream) ----------

  const executeRun = useCallback((company: Company) => {
    runningCountRef.current++;

    // Mark as no longer queued, reset startedAt to now (timeout starts now)
    setActiveRuns((prev) =>
      prev.map((r) =>
        r.companyId === company.company_id
          ? { ...r, queued: false, startedAt: Date.now() }
          : r,
      ),
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
            abortControllersRef.current.delete(company.company_id);
            setActiveRuns((prev) =>
              prev.map((r) =>
                r.companyId === company.company_id ? { ...r, isComplete: true } : r,
              ),
            );
            setReportReload((n) => n + 1);
            onRunComplete();
            break;
        }
      },
      () => {
        // SSE stream ended — force complete if not already
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
          prev.map((r) =>
            r.companyId === company.company_id ? { ...r, isComplete: true } : r,
          ),
        );
        onRunComplete();
      },
    );

    abortControllersRef.current.set(company.company_id, controller);
  }, [processQueue]);

  // ---------- Enqueue a company run ----------

  const handleRunCompany = useCallback((company: Company) => {
    // Skip if already running or queued
    if (activeRunsRef.current.some((r) => r.companyId === company.company_id && !r.isComplete)) return;
    if (runQueueRef.current.some((q) => q.company.company_id === company.company_id)) return;

    const willRunImmediately = runningCountRef.current < MAX_CONCURRENT_RUNS;

    // Create run entry
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
    // Abort the SSE connection
    const controller = abortControllersRef.current.get(companyId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(companyId);
    }

    // Collect partial findings from completed agents
    const run = activeRunsRef.current.find((r) => r.companyId === companyId);
    const findings = (run?.agents || [])
      .filter((a) => a.status === 'complete' && a.findings?.signals)
      .flatMap((a) => a.findings!.signals);

    // Mark as complete immediately so UI updates
    setActiveRuns((prev) =>
      prev.map((r) =>
        r.companyId === companyId ? { ...r, isComplete: true } : r,
      ),
    );
    runningCountRef.current--;
    processQueue();

    // Generate report + send email on backend
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

  // ---------- Render ----------

  // Missing Supabase config
  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5] px-4">
        <div className="w-full max-w-[480px] bg-white rounded-sm p-8" style={{ boxShadow: 'var(--card-shadow)' }}>
          <div className="flex items-center justify-center w-12 h-12 rounded-sm bg-red-50 border border-red-200 mx-auto mb-4">
            <span className="text-2xl leading-none">&#9888;</span>
          </div>
          <h1 className="text-[20px] font-semibold text-black text-center" style={{ fontFamily: "'Ubuntu', 'Helvetica Neue', Arial, sans-serif" }}>
            Configuration Required
          </h1>
          <p className="text-[13px] text-black/50 text-center mt-2 leading-snug mb-5" style={{ fontFamily: "'PT Serif', Georgia, serif" }}>
            Supabase environment variables are missing. Create an <code className="text-[#1342FF] bg-[#1342FF]/5 px-1.5 py-0.5 rounded-sm text-[12px]" style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}>app/.env</code> file:
          </p>
          <div className="bg-[#F5F5F5] border border-black/10 rounded-sm p-4 text-[12px] text-black/60 leading-relaxed" style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace" }}>
            <div className="text-black/30"># Supabase Dashboard &gt; Project Settings &gt; API</div>
            <div className="mt-1"><span className="text-[#1342FF]">VITE_SUPABASE_URL</span>=https://your-project.supabase.co</div>
            <div><span className="text-[#1342FF]">VITE_SUPABASE_ANON_KEY</span>=your-anon-key</div>
          </div>
          <p className="text-[11px] text-black/30 text-center mt-4" style={{ fontFamily: "'Departure Mono', 'SF Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Restart the dev server after creating the file.
          </p>
        </div>
      </div>
    );
  }

  // Auth loading
  if (authLoading) {
    return (
      <div className="app-loading">
        <span className="spinner" style={{ fontSize: 32 }}>&#8635;</span>
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated — show login/signup
  if (!user) {
    if (authPage === 'signup') {
      return <SignUpPage onSwitchToLogin={() => setAuthPage('login')} />;
    }
    return <LoginPage onSwitchToSignUp={() => setAuthPage('signup')} />;
  }

  // Data loading
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
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeRunCount={incompleteRuns.length}
        email={user.email || null}
        onSignOut={signOut}
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
