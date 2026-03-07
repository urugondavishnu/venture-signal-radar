import { Router, Request, Response } from 'express';
import { getCompanyById, updateLastAgentRun } from '../services/company-service';
import { storeSignals } from '../services/signal-service';
import { generateReportFromFindings, storeReport } from '../services/report-service';
import { sendReportEmail } from '../services/email-service';
import { getUserSettings, ensureUser } from '../services/user-service';
import { runIntelligenceAgents } from '../agents/orchestrator';
import { initSSE, sendSSE, endSSE } from '../utils/sse';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const agentRoutes = Router();

/**
 * POST /api/run-agents
 * Launch parallel TinyFish agents for a company.
 * Returns SSE stream with real-time updates.
 * After agents complete: stores signals, generates report, sends email.
 */
agentRoutes.post('/run-agents', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId, userEmail } = req as AuthenticatedRequest;
    const { company_id } = req.body;

    if (!company_id) {
      res.status(400).json({ error: 'company_id is required' });
      return;
    }

    // Ensure user record exists before report FK insert
    await ensureUser(userId, userEmail);

    const company = await getCompanyById(company_id);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    // Initialize SSE stream
    initSSE(res);

    // Send keepalive every 15s to prevent Render proxy from killing idle connections
    const heartbeat = setInterval(() => {
      try { res.write(': keepalive\n\n'); } catch { /* client disconnected */ }
    }, 15_000);

    sendSSE(res, {
      type: 'pipeline_started',
      data: {
        company_id: company.company_id,
        company_name: company.company_name,
        message: 'Launching intelligence agents...',
      },
    });

    let findings: Awaited<ReturnType<typeof runIntelligenceAgents>> = [];
    try {
      // Run all intelligence agents in parallel with SSE streaming
      findings = await runIntelligenceAgents(company, res);

      // Store collected signals (fire and forget)
      storeSignals(company.company_id, findings).catch((err) =>
        console.error('[Signals] Store failed:', err),
      );

      // Update last run timestamp
      await updateLastAgentRun(company.company_id);

      // Generate report directly from findings
      const reportData = generateReportFromFindings(company, findings);
      const report = await storeReport(company.company_id, reportData, userId);

      sendSSE(res, {
        type: 'report_generated',
        data: {
          report_id: report.report_id,
          report_data: reportData,
          total_signals: findings.length,
        },
      });

      // Send email report using auth user's email
      try {
        const settings = await getUserSettings(userId);
        const emailTo = settings.email || userEmail;
        if (emailTo) {
          console.log(`[Pipeline] Sending email for ${company.company_name} to ${emailTo}...`);
          const emailSent = await sendReportEmail(emailTo, company, reportData);
          console.log(`[Pipeline] Email result for ${company.company_name}: ${emailSent}`);
          sendSSE(res, {
            type: 'email_sent',
            data: { success: emailSent, email: emailTo },
          });
        }
      } catch (emailErr) {
        console.error(`[Pipeline] Email failed for ${company.company_name}:`, emailErr);
        sendSSE(res, { type: 'email_sent', data: { success: false } });
      }
    } finally {
      // Always send pipeline_complete and clean up, even if something above throws
      clearInterval(heartbeat);

      sendSSE(res, {
        type: 'pipeline_complete',
        data: {
          message: `All agents completed. ${findings.length} signals found.`,
          totalSignals: findings.length,
        },
      });

      endSSE(res);
    }
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
agentRoutes.get('/agent-status/:company_id', requireAuth, async (req: Request, res: Response) => {
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
