import { Router, Request, Response } from 'express';
import { getCompanyById, updateLastAgentRun } from '../services/company-service';
import { storeSignals } from '../services/signal-service';
import { generateReportFromFindings, storeReport } from '../services/report-service';
import { sendReportEmail } from '../services/email-service';
import { getUserSettings } from '../services/user-service';
import { runIntelligenceAgents } from '../agents/orchestrator';
import { initSSE, sendSSE, endSSE } from '../utils/sse';

export const agentRoutes = Router();

/**
 * POST /api/run-agents
 * Launch parallel TinyFish agents for a company
 * Returns SSE stream with real-time updates
 */
agentRoutes.post('/run-agents', async (req: Request, res: Response) => {
  try {
    const { company_id } = req.body;

    if (!company_id) {
      res.status(400).json({ error: 'company_id is required' });
      return;
    }

    const company = await getCompanyById(company_id);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Initialize SSE stream
    initSSE(res);

    sendSSE(res, {
      type: 'pipeline_started',
      data: {
        company_id: company.company_id,
        company_name: company.company_name,
        message: 'Launching intelligence agents...',
      },
    });

    // Run all intelligence agents in parallel with SSE streaming
    const findings = await runIntelligenceAgents(company, res);

    // Store collected signals (fire and forget — don't block report generation)
    storeSignals(company.company_id, findings).catch((err) =>
      console.error('[Signals] Store failed:', err),
    );

    // Update last run timestamp
    await updateLastAgentRun(company.company_id);

    // Generate report directly from findings (not DB round-trip)
    const reportData = generateReportFromFindings(company, findings);
    const report = await storeReport(company.company_id, reportData);

    sendSSE(res, {
      type: 'report_generated',
      data: {
        report_id: report.report_id,
        report_data: reportData,
        total_signals: findings.length,
      },
    });

    // Send email report on manual run
    const settings = await getUserSettings();
    if (settings.email) {
      try {
        const sent = await sendReportEmail(settings.email, company, reportData);
        sendSSE(res, {
          type: 'email_sent',
          data: { success: sent, email: settings.email },
        });
      } catch (emailErr) {
        console.error('[Email] Error sending report:', emailErr);
        sendSSE(res, {
          type: 'email_error',
          data: { error: 'Failed to send email report' },
        });
      }
    }

    sendSSE(res, {
      type: 'pipeline_complete',
      data: {
        message: `All agents completed. ${findings.length} signals found.`,
        totalSignals: findings.length,
      },
    });

    endSSE(res);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      sendSSE(res, { type: 'pipeline_error', data: { error: message } });
      endSSE(res);
    }
  }
});

/**
 * GET /api/agent-status/:company_id
 */
agentRoutes.get('/agent-status/:company_id', async (req: Request, res: Response) => {
  try {
    const company_id = req.params.company_id as string;
    const company = await getCompanyById(company_id);

    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    res.json({
      company_id: company.company_id,
      company_name: company.company_name,
      last_agent_run: company.last_agent_run,
      tracking_status: company.tracking_status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});
