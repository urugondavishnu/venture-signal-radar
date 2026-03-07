// In dev, Vite proxy handles /api → localhost:3001
// In prod, same origin serves both app and API
const API_BASE = '/api';

// ---------- Types ----------

export interface Company {
  company_id: string;
  company_name: string;
  website_url: string;
  domain: string;
  description: string | null;
  industry: string | null;
  careers_url: string | null;
  blog_url: string | null;
  pricing_url: string | null;
  created_at: string;
  last_agent_run: string | null;
  tracking_status: string;
}

export interface ReportSignal {
  title: string;
  summary: string;
  source: string;
  url?: string;
  detected_at: string;
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

export interface Report {
  report_id: string;
  company_id: string;
  generated_at: string;
  report_data: ReportData;
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

export interface ActiveRun {
  companyId: string;
  companyName: string;
  agents: AgentState[];
  isComplete: boolean;
  liveReport: ReportData | null;
  emailSent?: boolean;
  startedAt: number;
}

export type EmailFrequency = 'daily' | 'every_3_days' | 'weekly' | 'monthly' | 'only_on_run';

export interface UserSettings {
  email: string | null;
  email_frequency: EmailFrequency;
}

// ---------- REST API ----------

export async function getCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/companies`);
  const data = await res.json();
  return data.companies || [];
}

export async function deleteCompany(id: string): Promise<void> {
  await fetch(`${API_BASE}/companies/${id}`, { method: 'DELETE' });
}

export async function getReports(companyId?: string): Promise<Report[]> {
  const url = companyId ? `${API_BASE}/reports?company_id=${companyId}` : `${API_BASE}/reports`;
  const res = await fetch(url);
  const data = await res.json();
  return data.reports || [];
}

export async function getUserSettings(): Promise<UserSettings> {
  const res = await fetch(`${API_BASE}/user-settings`);
  return res.json();
}

export async function setEmail(email: string, frequency?: EmailFrequency): Promise<void> {
  await fetch(`${API_BASE}/set-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, email_frequency: frequency }),
  });
}

export async function setEmailFrequency(frequency: EmailFrequency): Promise<void> {
  await fetch(`${API_BASE}/set-email-frequency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_frequency: frequency }),
  });
}

// ---------- SSE Helpers ----------

export function storeCompanySSE(
  websiteUrl: string,
  onEvent: (event: { type: string; data: unknown }) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/store-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website_url: websiteUrl }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        onError(err.error || 'Failed to store company');
        return;
      }
      await readSSE(res, onEvent);
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err.message);
    });

  return controller;
}

export function runAgentsSSE(
  companyId: string,
  onEvent: (event: { type: string; data: unknown }) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${API_BASE}/run-agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: companyId }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        onError(err.error || 'Failed to run agents');
        return;
      }
      await readSSE(res, onEvent);
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err.message);
    });

  return controller;
}

async function readSSE(
  response: Response,
  onEvent: (event: { type: string; data: unknown }) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        onEvent(parsed);
      } catch {
        // skip malformed
      }
    }
  }
}
