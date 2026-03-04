import { Router, Request, Response } from 'express';
import { getReports, getAllReports, deleteReport } from '../services/report-service';

export const reportRoutes = Router();

/**
 * GET /api/reports
 * Get all reports (optionally filtered by company_id)
 */
reportRoutes.get('/reports', async (req: Request, res: Response) => {
  try {
    const { company_id } = req.query;

    if (company_id && typeof company_id === 'string') {
      const reports = await getReports(company_id);
      res.json({ reports });
    } else {
      const reports = await getAllReports();
      res.json({ reports });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a single report
 */
reportRoutes.delete('/reports/:id', async (req: Request, res: Response) => {
  try {
    const reportId = req.params.id as string;
    await deleteReport(reportId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
