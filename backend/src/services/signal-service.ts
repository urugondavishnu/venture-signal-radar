import { v4 as uuidv4 } from 'uuid';
import { eq, desc, gte, and } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { signals } from '../db/schema';
import { Signal, SignalFinding } from '../types';

/**
 * Store signals collected by agents
 */
export async function storeSignals(
  companyId: string,
  findings: SignalFinding[],
): Promise<Signal[]> {
  if (findings.length === 0) return [];

  const rows = findings.map((f) => ({
    signal_id: uuidv4(),
    company_id: companyId,
    signal_type: f.signal_type,
    source: f.source,
    title: f.title,
    content: f.summary,
    url: f.url || null,
    detected_at: new Date(),
  }));

  try {
    const inserted = await db.insert(signals).values(rows).returning();
    return inserted.map(rowToSignal);
  } catch (err) {
    console.error(`[Signals] Failed to store signals:`, err);
    return [];
  }
}

/**
 * Get recent signals for a company
 */
export async function getSignalsForCompany(
  companyId: string,
  limit = 50,
): Promise<Signal[]> {
  try {
    const rows = await db
      .select()
      .from(signals)
      .where(eq(signals.company_id, companyId))
      .orderBy(desc(signals.detected_at))
      .limit(limit);

    return rows.map(rowToSignal);
  } catch {
    return [];
  }
}

/**
 * Get signals since a specific date
 */
export async function getSignalsSince(
  companyId: string,
  since: string,
): Promise<Signal[]> {
  try {
    const rows = await db
      .select()
      .from(signals)
      .where(
        and(
          eq(signals.company_id, companyId),
          gte(signals.detected_at, new Date(since)),
        ),
      )
      .orderBy(desc(signals.detected_at));

    return rows.map(rowToSignal);
  } catch {
    return [];
  }
}

function rowToSignal(row: typeof signals.$inferSelect): Signal {
  return {
    signal_id: row.signal_id,
    company_id: row.company_id!,
    signal_type: row.signal_type as Signal['signal_type'],
    source: row.source,
    title: row.title,
    content: row.content,
    url: row.url,
    detected_at: row.detected_at?.toISOString() ?? new Date().toISOString(),
  };
}
