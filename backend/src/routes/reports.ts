import { Router, Request, Response } from 'express';
import { getReports, getAllReports, deleteReport, getReportById } from '../services/report-service';
import { getCompanyById } from '../services/company-service';
import { sendReportEmail, buildReportEmail } from '../services/email-service';
import { getUserSettings } from '../services/user-service';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const reportRoutes = Router();

/**
 * GET /api/reports
 * Get all reports for the authenticated user (optionally filtered by company_id)
 */
reportRoutes.get('/reports', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req as AuthenticatedRequest;
    const { company_id } = req.query;

    if (company_id && typeof company_id === 'string') {
      const reports = await getReports(company_id);
      res.json({ reports });
    } else {
      const reports = await getAllReports(userId);
      res.json({ reports });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/reports/:id/send-email
 * Send (or resend) a report email for an existing report
 */
reportRoutes.post('/reports/:id/send-email', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, userEmail } = req as AuthenticatedRequest;
    const reportId = req.params.id as string;

    const report = await getReportById(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const company = await getCompanyById(report.company_id);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const settings = await getUserSettings(userId);
    const emailTo = settings.email || userEmail;
    if (!emailTo) {
      res.status(400).json({ error: 'No email address configured. Set one in Settings.' });
      return;
    }

    const sent = await sendReportEmail(emailTo, company, report.report_data);
    res.json({ success: sent, email: emailTo });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/reports/:id/preview
 * Render the email HTML in-browser without sending
 */
reportRoutes.get('/reports/:id/preview', requireAuth, async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id as string;

    const report = await getReportById(reportId);
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const company = await getCompanyById(report.company_id);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const html = buildReportEmail(company, report.report_data);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a single report
 */
reportRoutes.delete('/reports/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id as string;
    await deleteReport(reportId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
