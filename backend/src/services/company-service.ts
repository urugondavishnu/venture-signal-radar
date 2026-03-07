import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../db/supabase';
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
  const { data: existing } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .eq('domain', domain)
    .single();

  if (existing) {
    return existing as Company;
  }

  const companyName = extractCompanyName(pageTitle, domain);

  const newCompany: Partial<Company> = {
    company_id: uuidv4(),
    user_id: userId,
    company_name: companyName,
    website_url: url,
    domain,
    tracking_status: 'active',
  };

  const { data, error } = await supabase
    .from('companies')
    .insert(newCompany)
    .select()
    .single();

  if (error) throw new Error(`Failed to store company: ${error.message}`);
  return data as Company;
}

/**
 * Update company with discovery agent results
 */
export async function updateCompanyFromDiscovery(
  companyId: string,
  discovery: DiscoveryResult,
): Promise<Company> {
  const updates: Partial<Company> = {
    company_name: discovery.company_name || undefined,
    description: discovery.description || undefined,
    industry: discovery.industry || undefined,
    founding_year: discovery.founding_year || undefined,
    headquarters: discovery.headquarters || undefined,
    company_size: discovery.company_size || undefined,
    detected_products: discovery.products || undefined,
    careers_url: discovery.careers_url || undefined,
    blog_url: discovery.blog_url || undefined,
    pricing_url: discovery.pricing_url || undefined,
  };

  // Remove undefined values
  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined),
  );

  const { data, error } = await supabase
    .from('companies')
    .update(cleanUpdates)
    .eq('company_id', companyId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update company: ${error.message}`);
  return data as Company;
}

/**
 * Get all tracked companies for a user
 */
export async function getCompanies(userId: string): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .eq('tracking_status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch companies: ${error.message}`);
  return (data || []) as Company[];
}

/**
 * Get a single company by ID
 */
export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error) return null;
  return data as Company;
}

/**
 * Delete a company and its associated signals + reports
 */
export async function deleteCompany(companyId: string): Promise<void> {
  // Delete signals first (foreign key)
  await supabase.from('signals').delete().eq('company_id', companyId);
  // Delete reports
  await supabase.from('reports').delete().eq('company_id', companyId);
  // Delete the company
  const { error } = await supabase.from('companies').delete().eq('company_id', companyId);
  if (error) throw new Error(`Failed to delete company: ${error.message}`);
}

/**
 * Update last agent run timestamp
 */
export async function updateLastAgentRun(companyId: string): Promise<void> {
  await supabase
    .from('companies')
    .update({ last_agent_run: new Date().toISOString() })
    .eq('company_id', companyId);
}
