/**
 * Daily Intelligence Pipeline — Standalone script for GitHub Actions
 * Runs all agents for each tracked company, generates reports, and sends emails.
 * No timeout constraints (GitHub Actions allows up to 6 hours).
 */

import dotenv from 'dotenv';
dotenv.config();

import { getCompanies, updateLastAgentRun } from '../services/company-service';
import { storeSignals } from '../services/signal-service';
import { generateReportFromFindings, storeReport } from '../services/report-service';
import { sendReportEmail } from '../services/email-service';
import { getUserSettings } from '../services/user-service';
import { runIntelligenceAgentsSilent } from '../agents/orchestrator';

const FREQUENCY_INTERVAL_DAYS: Record<string, number> = {
  daily: 1,
  every_3_days: 3,
  weekly: 7,
  monthly: 30,
};

function shouldRunToday(frequency: string, lastRun: string | null): boolean {
  if (frequency === 'only_on_run') return false;
  const intervalDays = FREQUENCY_INTERVAL_DAYS[frequency] || 1;
  if (!lastRun) return true;
  const daysSince = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= intervalDays;
}

async function main() {
  console.log('[Pipeline] Starting daily intelligence pipeline...');

  const settings = await getUserSettings();
  const { email, email_frequency } = settings;

  if (email_frequency === 'only_on_run') {
    console.log('[Pipeline] Frequency set to "only on run". Exiting.');
    return;
  }

  const companies = await getCompanies();
  if (companies.length === 0) {
    console.log('[Pipeline] No tracked companies. Exiting.');
    return;
  }

  const earliestRun = companies
    .map((c) => c.last_agent_run)
    .filter(Boolean)
    .sort()[0] || null;

  if (!shouldRunToday(email_frequency, earliestRun)) {
    console.log(`[Pipeline] Not time yet (frequency: ${email_frequency}). Exiting.`);
    return;
  }

  console.log(`[Pipeline] Processing ${companies.length} companies (frequency: ${email_frequency})...`);

  for (const company of companies) {
    try {
      console.log(`[Pipeline] Running agents for: ${company.company_name}`);

      const findings = await runIntelligenceAgentsSilent(company);

      storeSignals(company.company_id, findings).catch((err) =>
        console.error(`[Pipeline] Signal store failed for ${company.company_name}:`, err),
      );

      await updateLastAgentRun(company.company_id);

      const reportData = generateReportFromFindings(company, findings);
      await storeReport(company.company_id, reportData);

      if (email) {
        await sendReportEmail(email, company, reportData);
        console.log(`[Pipeline] Email sent for ${company.company_name}`);
      }

      console.log(`[Pipeline] Completed: ${company.company_name} (${findings.length} signals)`);
    } catch (err) {
      console.error(`[Pipeline] Error processing ${company.company_name}:`, err);
    }
  }

  console.log('[Pipeline] Daily pipeline complete.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Pipeline] Fatal error:', err);
    process.exit(1);
  });
