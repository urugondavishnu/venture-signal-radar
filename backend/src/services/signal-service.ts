import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase';
import { Signal, SignalFinding } from '../types';

/**
 * Store signals collected by agents
 */
export async function storeSignals(
  companyId: string,
  findings: SignalFinding[],
): Promise<Signal[]> {
  if (findings.length === 0) return [];

  const signals = findings.map((f) => ({
    signal_id: uuidv4(),
    company_id: companyId,
    signal_type: f.signal_type,
    source: f.source,
    title: f.title,
    content: f.summary,
    url: f.url || null,
    detected_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from('signals')
    .insert(signals)
    .select();

  if (error) {
    console.error(`[Signals] Failed to store signals: ${error.message}`);
    return [];
  }

  return (data || []) as Signal[];
}

/**
 * Get recent signals for a company
 */
export async function getSignalsForCompany(
  companyId: string,
  limit = 50,
): Promise<Signal[]> {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .eq('company_id', companyId)
    .order('detected_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data || []) as Signal[];
}

/**
 * Get signals since a specific date
 */
export async function getSignalsSince(
  companyId: string,
  since: string,
): Promise<Signal[]> {
  const { data, error } = await supabase
    .from('signals')
    .select('*')
    .eq('company_id', companyId)
    .gte('detected_at', since)
    .order('detected_at', { ascending: false });

  if (error) return [];
  return (data || []) as Signal[];
}
