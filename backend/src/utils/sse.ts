import { Response } from 'express';

/**
 * Initialize SSE response headers
 */
export function initSSE(res: Response): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
}

/**
 * Send SSE event to client
 */
export function sendSSE(res: Response, data: Record<string, unknown>): void {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Client may have disconnected
  }
}

/**
 * End SSE stream
 */
export function endSSE(res: Response): void {
  try {
    res.end();
  } catch {
    // Already closed
  }
}
