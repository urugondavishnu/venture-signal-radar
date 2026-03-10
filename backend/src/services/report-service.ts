import { v4 as uuidv4 } from 'uuid';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { reports, companies } from '../db/schema';
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
  userId?: string,
): Promise<Report> {
  const [inserted] = await db
    .insert(reports)
    .values({
      report_id: uuidv4(),
      company_id: companyId,
      user_id: userId ?? null,
      generated_at: new Date(),
      report_data: reportData,
    })
    .returning();

  return rowToReport(inserted);
}

/**
 * Get a single report by ID
 */
export async function getReportById(reportId: string): Promise<Report | null> {
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.report_id, reportId))
    .limit(1);

  return rows.length > 0 ? rowToReport(rows[0]) : null;
}

/**
 * Get reports for a company
 */
export async function getReports(companyId: string): Promise<Report[]> {
  try {
    const rows = await db
      .select()
      .from(reports)
      .where(eq(reports.company_id, companyId))
      .orderBy(desc(reports.generated_at));

    return rows.map(rowToReport);
  } catch {
    return [];
  }
}

/**
 * Delete a report by ID
 */
export async function deleteReport(reportId: string): Promise<void> {
  await db.delete(reports).where(eq(reports.report_id, reportId));
}

/**
 * Get all reports for a user (with company info)
 */
export async function getAllReports(userId: string): Promise<Report[]> {
  try {
    const rows = await db
      .select({
        report_id: reports.report_id,
        company_id: reports.company_id,
        user_id: reports.user_id,
        generated_at: reports.generated_at,
        report_data: reports.report_data,
        company_name: companies.company_name,
        website_url: companies.website_url,
      })
      .from(reports)
      .leftJoin(companies, eq(reports.company_id, companies.company_id))
      .where(eq(reports.user_id, userId))
      .orderBy(desc(reports.generated_at))
      .limit(50);

    return rows.map((r) => ({
      report_id: r.report_id,
      company_id: r.company_id!,
      generated_at: r.generated_at?.toISOString() ?? new Date().toISOString(),
      report_data: r.report_data as ReportData,
      companies: r.company_name
        ? { company_name: r.company_name, website_url: r.website_url }
        : undefined,
    })) as Report[];
  } catch {
    return [];
  }
}

function rowToReport(row: typeof reports.$inferSelect): Report {
  return {
    report_id: row.report_id,
    company_id: row.company_id!,
    generated_at: row.generated_at?.toISOString() ?? new Date().toISOString(),
    report_data: row.report_data as ReportData,
  };
}
