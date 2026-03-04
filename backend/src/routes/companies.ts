import { Router, Request, Response } from 'express';
import { storeCompany, getCompanies, updateCompanyFromDiscovery, deleteCompany } from '../services/company-service';
import { runDiscoveryAgent } from '../agents/orchestrator';
import { initSSE, sendSSE, endSSE } from '../utils/sse';
import { DiscoveryResult } from '../types';

export const companyRoutes = Router();

/**
 * POST /api/store-company
 * Bookmark a company and run discovery agents
 */
companyRoutes.post('/store-company', async (req: Request, res: Response) => {
  try {
    const { website_url, page_title } = req.body;

    if (!website_url) {
      res.status(400).json({ error: 'website_url is required' });
      return;
    }

    // Initialize SSE stream
    initSSE(res);

    // Store company record
    const company = await storeCompany(website_url, page_title);

    sendSSE(res, {
      type: 'company_stored',
      data: company,
    });

    // End SSE immediately so the UI can show the Run button right away
    sendSSE(res, {
      type: 'pipeline_complete',
      data: { message: 'Company stored', company },
    });
    endSSE(res);

    // Run discovery in background — enriches DB, UI picks it up on next load
    runDiscoveryAgent(company.website_url)
      .then(async (discoveryResult) => {
        if (discoveryResult) {
          await updateCompanyFromDiscovery(
            company.company_id,
            discoveryResult as DiscoveryResult,
          );
          console.log(`[Discovery] Enriched: ${company.company_name}`);
        }
      })
      .catch((err) => {
        console.error(`[Discovery] Background enrichment failed for ${company.company_name}:`, err);
      });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // If headers not sent yet, send JSON error
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    } else {
      sendSSE(res, { type: 'pipeline_error', data: { error: message } });
      endSSE(res);
    }
  }
});

/**
 * GET /api/companies
 * Get all tracked companies
 */
companyRoutes.get('/companies', async (_req: Request, res: Response) => {
  try {
    const companies = await getCompanies();
    res.json({ companies });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * DELETE /api/companies/:id
 * Delete a company and all associated signals + reports
 */
companyRoutes.delete('/companies/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.params.id as string;
    await deleteCompany(companyId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

