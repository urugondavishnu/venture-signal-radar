import { Router, Request, Response } from 'express';
import { getCompanies } from '../services/company-service';
import { getReports } from '../services/report-service';
import { sendReportEmail } from '../services/email-service';
import { getUserSettings } from '../services/user-service';

export const cronRoutes = Router();

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

/**
 * GET /api/cron/daily-pipeline
 * Vercel Cron endpoint — sends the latest report email for each tracked company.
 * Vercel Cron sends GET requests with x-vercel-cron-auth-token header.
 */
cronRoutes.get('/cron/daily-pipeline', async (req: Request, res: Response) => {
  // Verify Vercel cron secret
  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const settings = await getUserSettings();
    const { email, email_frequency } = settings;

    if (!email) {
      res.json({ message: 'No email configured. Skipped.' });
      return;
    }

    if (email_frequency === 'only_on_run') {
      res.json({ message: 'Frequency set to "only on run". Skipped.' });
      return;
    }

    const companies = await getCompanies();
    if (companies.length === 0) {
      res.json({ message: 'No tracked companies. Skipped.' });
      return;
    }

    const earliestRun = companies
      .map((c) => c.last_agent_run)
      .filter(Boolean)
      .sort()[0] || null;

    if (!shouldRunToday(email_frequency, earliestRun)) {
      res.json({ message: `Not time yet (frequency: ${email_frequency}). Skipped.` });
      return;
    }

    let sent = 0;
    for (const company of companies) {
      try {
        const reports = await getReports(company.company_id);
        if (reports.length === 0) continue;

        const latestReport = reports[0]; // Already sorted by generated_at desc
        await sendReportEmail(email, company, latestReport.report_data);
        sent++;
      } catch (err) {
        console.error(`[Cron] Email failed for ${company.company_name}:`, err);
      }
    }

    res.json({ message: `Sent ${sent} report emails for ${companies.length} companies.` });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Cron] Pipeline failed:', err);
    res.status(500).json({ error: message });
  }
});
