/**
 * Backend API Client
 */

const API_BASE = 'http://localhost:3001/api';

// ---------- Companies ----------

export async function storeCompany(websiteUrl: string, pageTitle?: string) {
  return fetch(`${API_BASE}/store-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ website_url: websiteUrl, page_title: pageTitle }),
  });
}

export async function getCompanies() {
  const response = await fetch(`${API_BASE}/companies`);
  return response.json();
}

export async function deleteCompany(companyId: string) {
  const response = await fetch(`${API_BASE}/companies/${companyId}`, { method: 'DELETE' });
  return response.json();
}

// ---------- Agents ----------

export async function runAgents(companyId: string) {
  return fetch(`${API_BASE}/run-agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: companyId }),
  });
}

// ---------- Reports ----------

export async function getReports(companyId?: string) {
  const url = companyId ? `${API_BASE}/reports?company_id=${companyId}` : `${API_BASE}/reports`;
  const response = await fetch(url);
  return response.json();
}

export async function deleteReport(reportId: string) {
  const response = await fetch(`${API_BASE}/reports/${reportId}`, { method: 'DELETE' });
  return response.json();
}

// ---------- User Settings ----------

export async function setEmail(email: string, emailFrequency?: string) {
  const body: Record<string, string> = { email };
  if (emailFrequency) body.email_frequency = emailFrequency;
  const response = await fetch(`${API_BASE}/set-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function setEmailFrequency(frequency: string) {
  const response = await fetch(`${API_BASE}/set-email-frequency`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_frequency: frequency }),
  });
  return response.json();
}

export async function getUserSettings(): Promise<{
  email: string | null;
  email_frequency: string;
}> {
  const response = await fetch(`${API_BASE}/user-settings`);
  return response.json();
}

// ---------- SSE Stream Reader ----------

export interface SSEStreamCallbacks {
  onEvent: (event: { type: string; data: Record<string, unknown> }) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

export async function readSSEStream(
  response: Response,
  callbacks: SSEStreamCallbacks,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));
          callbacks.onEvent(data);

          if (data.type === 'pipeline_complete' || data.type === 'pipeline_error') {
            callbacks.onComplete();
          }
        } catch {
          // Skip malformed JSON
        }
      }
    }
    callbacks.onComplete();
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'Stream error');
  }
}
