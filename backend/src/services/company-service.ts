import { v4 as uuidv4 } from 'uuid';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { companies, signals, reports } from '../db/schema';
import { extractDomain, normalizeUrl, extractCompanyName } from '../utils/domain';
import { Company, DiscoveryResult } from '../types';

/**
 * Create or return existing company record
 */
export async function storeCompany(
  userId: string,
  websiteUrl: string,
  pageTitle?: string,
): Promise<Company> {
  const url = normalizeUrl(websiteUrl);
  const domain = extractDomain(url);

  // Check if company already exists for this user + domain
  const existing = await db
    .select()
    .from(companies)
    .where(and(eq(companies.user_id, userId), eq(companies.domain, domain)))
    .limit(1);

  if (existing.length > 0) {
    return rowToCompany(existing[0]);
  }

  const companyName = extractCompanyName(pageTitle, domain);
  const companyId = uuidv4();

  const [inserted] = await db
    .insert(companies)
    .values({
      company_id: companyId,
      user_id: userId,
      company_name: companyName,
      website_url: url,
      domain,
      tracking_status: 'active',
    })
    .returning();

  return rowToCompany(inserted);
}

/**
 * Update company with discovery agent results
 */
export async function updateCompanyFromDiscovery(
  companyId: string,
  discovery: DiscoveryResult,
): Promise<Company> {
  const updates: Record<string, unknown> = {};
  if (discovery.company_name) updates.company_name = discovery.company_name;
  if (discovery.description) updates.description = discovery.description;
  if (discovery.industry) updates.industry = discovery.industry;
  if (discovery.founding_year) updates.founding_year = discovery.founding_year;
  if (discovery.headquarters) updates.headquarters = discovery.headquarters;
  if (discovery.company_size) updates.company_size = discovery.company_size;
  if (discovery.products) updates.detected_products = discovery.products;
  if (discovery.careers_url) updates.careers_url = discovery.careers_url;
  if (discovery.blog_url) updates.blog_url = discovery.blog_url;
  if (discovery.pricing_url) updates.pricing_url = discovery.pricing_url;

  const [updated] = await db
    .update(companies)
    .set(updates)
    .where(eq(companies.company_id, companyId))
    .returning();

  if (!updated) throw new Error('Failed to update company: not found');
  return rowToCompany(updated);
}

/**
 * Get all tracked companies for a user
 */
export async function getCompanies(userId: string): Promise<Company[]> {
  const rows = await db
    .select()
    .from(companies)
    .where(and(eq(companies.user_id, userId), eq(companies.tracking_status, 'active')))
    .orderBy(desc(companies.created_at));

  return rows.map(rowToCompany);
}

/**
 * Get a single company by ID
 */
export async function getCompanyById(companyId: string): Promise<Company | null> {
  const rows = await db
    .select()
    .from(companies)
    .where(eq(companies.company_id, companyId))
    .limit(1);

  return rows.length > 0 ? rowToCompany(rows[0]) : null;
}

/**
 * Delete a company and its associated signals + reports
 */
export async function deleteCompany(companyId: string): Promise<void> {
  await db.delete(signals).where(eq(signals.company_id, companyId));
  await db.delete(reports).where(eq(reports.company_id, companyId));
  await db.delete(companies).where(eq(companies.company_id, companyId));
}

/**
 * Update last agent run timestamp
 */
export async function updateLastAgentRun(companyId: string): Promise<void> {
  await db
    .update(companies)
    .set({ last_agent_run: new Date() })
    .where(eq(companies.company_id, companyId));
}

// Map DB row to Company type (timestamps to ISO strings)
function rowToCompany(row: typeof companies.$inferSelect): Company {
  return {
    ...row,
    user_id: row.user_id!,
    created_at: row.created_at?.toISOString() ?? new Date().toISOString(),
    last_agent_run: row.last_agent_run?.toISOString() ?? null,
    tracking_status: (row.tracking_status as Company['tracking_status']) ?? 'active',
  };
}
