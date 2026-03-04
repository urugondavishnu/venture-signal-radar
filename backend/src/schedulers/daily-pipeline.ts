import cron from 'node-cron';
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

/**
 * Check if enough days have passed since last run based on frequency
 */
function shouldRunToday(frequency: string, lastRun: string | null): boolean {
  if (frequency === 'only_on_run') return false;
  const intervalDays = FREQUENCY_INTERVAL_DAYS[frequency] || 1;
  if (!lastRun) return true;
  const daysSince = (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= intervalDays;
}

/**
 * Scheduled Intelligence Pipeline
 * Runs at 7:00 AM every day, respects the user's email_frequency setting
 * For each tracked company: runs agents, collects signals, generates report, sends email
 */
export function startScheduler(): void {
  // Run at 7:00 AM daily
  cron.schedule('0 7 * * *', async () => {
    console.log('[Scheduler] Starting intelligence pipeline...');

    try {
      const settings = await getUserSettings();
      const { email, email_frequency } = settings;

      if (email_frequency === 'only_on_run') {
        console.log('[Scheduler] Frequency set to "only on run". Skipping.');
        return;
      }

      const companies = await getCompanies();

      if (companies.length === 0) {
        console.log('[Scheduler] No tracked companies. Skipping.');
        return;
      }

      // Check if it's time to run based on the earliest last_agent_run
      const earliestRun = companies
        .map((c) => c.last_agent_run)
        .filter(Boolean)
        .sort()[0] || null;

      if (!shouldRunToday(email_frequency, earliestRun)) {
        console.log(`[Scheduler] Not time yet (frequency: ${email_frequency}). Skipping.`);
        return;
      }

      console.log(`[Scheduler] Processing ${companies.length} companies (frequency: ${email_frequency})...`);

      // Process companies sequentially to avoid overwhelming TinyFish API
      for (const company of companies) {
        try {
          console.log(`[Scheduler] Running agents for: ${company.company_name}`);

          // Run all intelligence agents (no SSE)
          const findings = await runIntelligenceAgentsSilent(company);

          // Store signals (fire and forget — don't block report)
          storeSignals(company.company_id, findings).catch((err) =>
            console.error(`[Scheduler] Signal store failed for ${company.company_name}:`, err),
          );

          // Update last run
          await updateLastAgentRun(company.company_id);

          // Generate report directly from findings (not DB round-trip)
          const reportData = generateReportFromFindings(company, findings);
          await storeReport(company.company_id, reportData);

          // Send email if configured
          if (email) {
            await sendReportEmail(email, company, reportData);
          }

          console.log(
            `[Scheduler] Completed: ${company.company_name} (${findings.length} signals)`,
          );
        } catch (err) {
          console.error(
            `[Scheduler] Error processing ${company.company_name}:`,
            err,
          );
        }
      }

      console.log('[Scheduler] Pipeline complete.');
    } catch (err) {
      console.error('[Scheduler] Pipeline failed:', err);
    }
  });

  console.log('[Scheduler] Intelligence pipeline scheduled (7:00 AM, respects frequency setting)');
}
