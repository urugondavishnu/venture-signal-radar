/**
 * TinyFish Web Agent API Client
 * Handles SSE communication with TinyFish agent platform
 */

const TINYFISH_API_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';
const AGENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per agent

export interface TinyfishCallbacks {
  onConnecting: () => void;
  onBrowsing: (message: string) => void;
  onStreamingUrl: (url: string) => void;
  onStatus: (message: string) => void;
  onComplete: (resultJson: unknown) => void;
  onError: (error: string) => void;
}

export interface TinyfishRequest {
  url: string;
  goal: string;
}

/**
 * Start a single TinyFish agent and stream its events via callbacks
 */
export function startTinyfishAgent(
  config: TinyfishRequest,
  callbacks: TinyfishCallbacks,
): AbortController {
  const controller = new AbortController();
  const apiKey = process.env.TINYFISH_API_KEY;

  if (!apiKey) {
    callbacks.onError('TINYFISH_API_KEY not configured');
    return controller;
  }

  const timeout = setTimeout(() => {
    controller.abort();
    // On timeout, treat as complete with 0 results instead of showing an error
    callbacks.onComplete({ signals: [] });
  }, AGENT_TIMEOUT_MS);

  callbacks.onConnecting();

  fetch(TINYFISH_API_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: config.url,
      goal: config.goal,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`TinyFish API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';
      let streamingUrlSent = false;

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

            // Streaming URL (appears once, early)
            if (data.streamingUrl && !streamingUrlSent) {
              streamingUrlSent = true;
              callbacks.onStreamingUrl(data.streamingUrl);
              callbacks.onBrowsing('Agent is browsing the website...');
            }

            // Step / status updates
            if (data.type === 'STEP' || data.purpose || data.action) {
              const message =
                data.message || data.purpose || data.action || 'Processing...';
              callbacks.onStatus(message);
            }

            // Completion
            if (
              (data.type === 'COMPLETE' || data.status === 'COMPLETED') &&
              data.resultJson
            ) {
              let result: unknown;
              try {
                result =
                  typeof data.resultJson === 'string'
                    ? JSON.parse(data.resultJson)
                    : data.resultJson;
              } catch {
                result = data.resultJson;
              }
              callbacks.onComplete(result);
            }

            // Error from TinyFish
            if (data.type === 'ERROR') {
              callbacks.onError(data.message || 'Agent encountered an error');
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') {
        callbacks.onError(err.message);
      }
    })
    .finally(() => {
      clearTimeout(timeout);
    });

  return controller;
}

/**
 * Run multiple TinyFish agents in parallel
 * Returns a promise that resolves when all agents complete
 */
export async function runParallelAgents(
  agents: Array<{
    id: string;
    config: TinyfishRequest;
    callbacks: TinyfishCallbacks;
  }>,
): Promise<void> {
  const promises = agents.map(
    (agent) =>
      new Promise<void>((resolve) => {
        const originalOnComplete = agent.callbacks.onComplete;
        const originalOnError = agent.callbacks.onError;

        agent.callbacks.onComplete = (result) => {
          originalOnComplete(result);
          resolve();
        };
        agent.callbacks.onError = (error) => {
          originalOnError(error);
          resolve(); // Resolve even on error so Promise.allSettled isn't needed
        };

        startTinyfishAgent(agent.config, agent.callbacks);
      }),
  );

  await Promise.allSettled(promises);
}
