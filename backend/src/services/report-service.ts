import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase';
import { Report, ReportData, ReportSignal, Signal, Company, SignalFinding } from '../types';

/**
 * Generate a structured intelligence report from signals
 */
export function generateReport(company: Company, signals: Signal[]): ReportData {
  const categorize = (type: string): ReportSignal[] =>
    signals
      .filter((s) => s.signal_type === type)
      .map((s) => ({
        title: s.title,
        summary: s.content,
        source: s.source,
        url: s.url || undefined,
        detected_at: s.detected_at,
      }));

  return {
    company_overview: company.description || `Intelligence report for ${company.company_name}`,
    product_launches: categorize('product_launch'),
    financings: categorize('financing'),
    leadership_changes: categorize('leadership_change'),
    revenue_milestones: categorize('revenue_milestone'),
    customer_wins: categorize('customer_win'),
    pricing_updates: categorize('pricing_update'),
    hiring_trends: categorize('hiring_trend'),
    general_news: categorize('general_news'),
    founder_contacts: categorize('founder_contact'),
    leading_indicators: categorize('leading_indicator'),
    competitive_landscape: categorize('competitive_landscape'),
    fundraising_signals: categorize('fundraising_signal'),
  };
}

/**
 * Generate a structured intelligence report directly from agent findings
 * (bypasses DB round-trip for reliability)
 */
export function generateReportFromFindings(company: Company, findings: SignalFinding[]): ReportData {
  const categorize = (type: string): ReportSignal[] =>
    findings
      .filter((f) => f.signal_type === type)
      .map((f) => ({
        title: f.title,
        summary: f.summary,
        source: f.source,
        url: f.url || undefined,
        detected_at: new Date().toISOString(),
      }));

  return {
    company_overview: company.description || `Intelligence report for ${company.company_name}`,
    product_launches: categorize('product_launch'),
    financings: categorize('financing'),
    leadership_changes: categorize('leadership_change'),
    revenue_milestones: categorize('revenue_milestone'),
    customer_wins: categorize('customer_win'),
    pricing_updates: categorize('pricing_update'),
    hiring_trends: categorize('hiring_trend'),
    general_news: categorize('general_news'),
    founder_contacts: categorize('founder_contact'),
    leading_indicators: categorize('leading_indicator'),
    competitive_landscape: categorize('competitive_landscape'),
    fundraising_signals: categorize('fundraising_signal'),
  };
}

/**
 * Store report in database
 */
export async function storeReport(
  companyId: string,
  reportData: ReportData,
): Promise<Report> {
  const report = {
    report_id: uuidv4(),
    company_id: companyId,
    generated_at: new Date().toISOString(),
    report_data: reportData,
  };

  const { data, error } = await supabase
    .from('reports')
    .insert(report)
    .select()
    .single();

  if (error) throw new Error(`Failed to store report: ${error.message}`);
  return data as Report;
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('report_id', reportId)
    .single();

  if (error) return null;
  return data as Report;
}

/**
 * Get reports for a company
 */
export async function getReports(companyId: string): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('company_id', companyId)
    .order('generated_at', { ascending: false });

  if (error) return [];
  return (data || []) as Report[];
}

/**
 * Delete a report by ID
 */
export async function deleteReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('report_id', reportId);
  if (error) throw new Error(`Failed to delete report: ${error.message}`);
}

/**
 * Get all reports across all companies
 */
export async function getAllReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('*, companies(company_name, website_url)')
    .order('generated_at', { ascending: false })
    .limit(50);

  if (error) return [];
  return (data || []) as Report[];
}
