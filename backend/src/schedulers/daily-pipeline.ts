import cron from 'node-cron';
import { getCompanies, updateLastAgentRun } from '../services/company-service';
import { storeSignals } from '../services/signal-service';
import { generateReportFromFindings, storeReport } from '../services/report-service';
import { sendReportEmail } from '../services/email-service';
import { getAllUsers } from '../services/user-service';
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
 * Runs at 7:00 AM every day for ALL users, respects each user's email_frequency setting
 */
export function startScheduler(): void {
  cron.schedule('0 7 * * *', async () => {
    console.log('[Scheduler] Starting intelligence pipeline for all users...');

    try {
      const users = await getAllUsers();

      if (users.length === 0) {
        console.log('[Scheduler] No users found. Skipping.');
        return;
      }

      for (const user of users) {
        const { user_id, email, email_frequency } = user;

        if (email_frequency === 'only_on_run') {
          console.log(`[Scheduler] User ${email}: frequency "only_on_run". Skipping.`);
          continue;
        }

        const companies = await getCompanies(user_id);

        if (companies.length === 0) {
          console.log(`[Scheduler] User ${email}: no tracked companies. Skipping.`);
          continue;
        }

        const earliestRun = companies
          .map((c) => c.last_agent_run)
          .filter(Boolean)
          .sort()[0] || null;

        if (!shouldRunToday(email_frequency, earliestRun)) {
          console.log(`[Scheduler] User ${email}: not time yet (frequency: ${email_frequency}). Skipping.`);
          continue;
        }

        console.log(`[Scheduler] Processing ${companies.length} companies for user ${email} (frequency: ${email_frequency})...`);

        for (const company of companies) {
          try {
            console.log(`[Scheduler] Running agents for: ${company.company_name} (user: ${email})`);

            const findings = await runIntelligenceAgentsSilent(company);

            storeSignals(company.company_id, findings).catch((err) =>
              console.error(`[Scheduler] Signal store failed for ${company.company_name}:`, err),
            );

            await updateLastAgentRun(company.company_id);

            const reportData = generateReportFromFindings(company, findings);
            await storeReport(company.company_id, reportData, user_id);

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
      }

      console.log('[Scheduler] Pipeline complete for all users.');
    } catch (err) {
      console.error('[Scheduler] Pipeline failed:', err);
    }
  });

  console.log('[Scheduler] Intelligence pipeline scheduled (7:00 AM, per-user frequency)');
}
