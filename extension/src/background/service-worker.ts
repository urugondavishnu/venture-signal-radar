/**
 * Chrome Extension Service Worker (Background Script)
 * Handles SSE streaming for agent runs so they persist across popup open/close cycles.
 * State is stored in chrome.storage.local and the popup reads from it.
 *
 * Companies are queued and processed ONE AT A TIME so each company gets
 * TinyFish's full concurrency capacity (all 10 agents run simultaneously).
 *
 * Uses chrome.alarms as a fallback timeout — if the SSE stream drops
 * (e.g. service worker killed by Chrome), the alarm force-completes stale agents.
 */

const API_BASE = 'https://venture-signal-radar.onrender.com/api';
const RUN_TIMEOUT_MINUTES = 5.5; // Slightly longer than backend's 5-min agent timeout

// ---- Types ----

interface StoredAgentState {
  agentId: string;
  agentType: string;
  agentName: string;
  status: 'connecting' | 'browsing' | 'analyzing' | 'complete' | 'error';
  message?: string;
  streamingUrl?: string;
  findings?: { signals: Array<{ signal_type: string; title: string; summary: string; source: string }> };
  error?: string;
}

interface StoredRun {
  companyId: string;
  companyName: string;
  agents: StoredAgentState[];
  isComplete: boolean;
  liveReport: Record<string, unknown> | null;
  emailSent?: boolean;
  startedAt?: number;
  queued?: boolean; // true if waiting in queue, false/undefined if actively running
}

// ---- Storage mutex ----

let storageLock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void;
  const next = new Promise<void>((r) => { release = r; });
  const prev = storageLock;
  storageLock = next;
  return prev.then(async () => {
    try {
      return await fn();
    } finally {
      release!();
    }
  });
}

// ---- Storage helpers ----

async function getActiveRuns(): Promise<StoredRun[]> {
  const result = await chrome.storage.local.get('activeRuns');
  return result.activeRuns || [];
}

async function saveActiveRuns(runs: StoredRun[]): Promise<void> {
  await chrome.storage.local.set({ activeRuns: runs });
}

function updateStoredRun(companyId: string, updates: Partial<StoredRun>): Promise<void> {
  return withLock(async () => {
    const runs = await getActiveRuns();
    const updated = runs.map((r) =>
      r.companyId === companyId ? { ...r, ...updates } : r,
    );
    await saveActiveRuns(updated);
  });
}

function updateAgentInStoredRun(companyId: string, agentData: StoredAgentState): Promise<void> {
  return withLock(async () => {
    const runs = await getActiveRuns();
    const updated = runs.map((r) => {
      if (r.companyId !== companyId) return r;
      const idx = r.agents.findIndex((a) => a.agentId === agentData.agentId);
      const agents =
        idx >= 0
          ? r.agents.map((a) => (a.agentId === agentData.agentId ? { ...a, ...agentData } : a))
          : [...r.agents, agentData];
      return { ...r, agents };
    });
    await saveActiveRuns(updated);
  });
}

// ---- Force-complete stale runs ----

function forceCompleteRun(companyId: string): Promise<void> {
  return withLock(async () => {
    const runs = await getActiveRuns();
    const run = runs.find((r) => r.companyId === companyId);
    if (!run || run.isComplete) return;

    console.log(`[SW] Force-completing run for ${run.companyName} (timeout)`);

    const updatedAgents = run.agents.map((a) =>
      a.status !== 'complete' && a.status !== 'error'
        ? { ...a, status: 'complete' as const, findings: { signals: [] }, message: '0 results found' }
        : a,
    );

    const updated = runs.map((r) =>
      r.companyId === companyId ? { ...r, agents: updatedAgents, isComplete: true } : r,
    );
    await saveActiveRuns(updated);
  });
}

// ---- SSE stream reader ----

async function readSSE(
  response: Response,
  onEvent: (event: { type: string; data: Record<string, unknown> }) => Promise<void>,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;

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
          const parsed = JSON.parse(line.slice(6));
          await onEvent(parsed);
        } catch {
          // Skip malformed JSON
        }
      }
    }
  } catch (err) {
    console.error('[SW] Stream read error:', err);
  }
}

// ---- Run queue ----
// Companies are processed one at a time so each gets TinyFish's full capacity

const runQueue: Array<{ companyId: string; companyName: string }> = [];
let isProcessingQueue = false;

async function enqueueRun(companyId: string, companyName: string): Promise<void> {
  // Check for duplicate (already running or queued)
  const runs = await getActiveRuns();
  if (runs.some((r) => r.companyId === companyId && !r.isComplete)) return;

  // Check if already in queue
  if (runQueue.some((q) => q.companyId === companyId)) return;

  // Add to storage as queued (so UI shows it's waiting)
  await withLock(async () => {
    const current = await getActiveRuns();
    const newRun: StoredRun = {
      companyId,
      companyName,
      agents: [],
      isComplete: false,
      liveReport: null,
      startedAt: Date.now(),
      queued: true,
    };
    await saveActiveRuns([...current, newRun]);
  });

  runQueue.push({ companyId, companyName });
  processQueue();
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (runQueue.length > 0) {
    const next = runQueue.shift()!;
    console.log(`[SW] Starting run for ${next.companyName} (${runQueue.length} remaining in queue)`);

    // Mark as no longer queued
    await updateStoredRun(next.companyId, { queued: false });

    await executeAgentRun(next.companyId, next.companyName);
  }

  isProcessingQueue = false;
}

// ---- Agent run execution (single company) ----

async function executeAgentRun(companyId: string, companyName: string): Promise<void> {
  chrome.alarms.create(`run-timeout-${companyId}`, { delayInMinutes: RUN_TIMEOUT_MINUTES });

  try {
    const response = await fetch(`${API_BASE}/run-agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_id: companyId }),
    });

    await readSSE(response, async (event) => {
      const { type, data } = event as { type: string; data: Record<string, unknown> };

      switch (type) {
        case 'agent_connecting':
        case 'agent_browsing':
        case 'agent_streaming_url':
        case 'agent_status':
        case 'agent_complete':
        case 'agent_error':
          await updateAgentInStoredRun(companyId, data as unknown as StoredAgentState);
          break;
        case 'report_generated':
          await updateStoredRun(companyId, { liveReport: data.report_data as Record<string, unknown> });
          break;
        case 'email_sent':
          await updateStoredRun(companyId, { emailSent: (data as Record<string, unknown>).success as boolean });
          break;
        case 'pipeline_complete':
          await updateStoredRun(companyId, { isComplete: true });
          chrome.alarms.clear(`run-timeout-${companyId}`);
          break;
      }
    });

    // If stream ended without pipeline_complete, mark complete anyway
    const currentRuns = await getActiveRuns();
    const run = currentRuns.find((r) => r.companyId === companyId);
    if (run && !run.isComplete) {
      await forceCompleteRun(companyId);
      chrome.alarms.clear(`run-timeout-${companyId}`);
    }
  } catch (err) {
    console.error(`[SW] Agent run failed for ${companyName}:`, err);
    await forceCompleteRun(companyId);
    chrome.alarms.clear(`run-timeout-${companyId}`);
  }
}

// ---- Dismiss ----

function dismissRun(companyId: string): Promise<void> {
  // Also remove from queue if queued
  const idx = runQueue.findIndex((q) => q.companyId === companyId);
  if (idx >= 0) runQueue.splice(idx, 1);

  return withLock(async () => {
    const runs = await getActiveRuns();
    await saveActiveRuns(runs.filter((r) => r.companyId !== companyId));
    chrome.alarms.clear(`run-timeout-${companyId}`);
  });
}

// ---- Extension lifecycle ----

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Signal Tracker] Extension installed');
});

// ---- Alarm handler (fallback timeout) ----

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('run-timeout-')) {
    const companyId = alarm.name.replace('run-timeout-', '');
    await forceCompleteRun(companyId);
  }
});

// ---- Message handler ----

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_INFO') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab) {
        sendResponse({
          url: tab.url || '',
          title: tab.title || '',
          domain: tab.url ? new URL(tab.url).hostname.replace(/^www\./, '') : '',
        });
      } else {
        sendResponse({ url: '', title: '', domain: '' });
      }
    });
    return true;
  }

  if (message.type === 'START_RUN') {
    enqueueRun(message.companyId, message.companyName);
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'DISMISS_RUN') {
    dismissRun(message.companyId);
    sendResponse({ ok: true });
    return false;
  }
});
