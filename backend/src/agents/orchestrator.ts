/**
 * Agent Orchestrator
 * Manages parallel TinyFish agent execution for company intelligence gathering
 */

import { Response } from 'express';
import { startTinyfishAgent, TinyfishCallbacks } from './tinyfish-client';

const ORCHESTRATOR_AGENT_TIMEOUT_MS = 5.5 * 60 * 1000; // 5.5 min hard cutoff per agent

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => {
        onTimeout();
        reject(new Error('Agent timed out'));
      }, ms);
    }),
  ]);
}

import {
  buildBlogScannerGoal,
  buildNewsScannerGoal,
  buildHiringMonitorGoal,
  buildPricingMonitorGoal,
  buildProductLaunchGoal,
  buildGitHubActivityGoal,
  buildDiscoveryGoal,
  buildFounderContactGoal,
  buildLeadingIndicatorsGoal,
  buildCompetitiveAlertingGoal,
  buildFundraisingDetectorGoal,
} from './goals';
import { sendSSE } from '../utils/sse';
import { Company, AgentType, SignalFinding } from '../types';

interface AgentDefinition {
  id: string;
  type: AgentType;
  name: string;
  url: string;
  goal: string;
}

/**
 * Build the list of intelligence agents for a company
 */
function buildIntelligenceAgents(company: Company): AgentDefinition[] {
  const agents: AgentDefinition[] = [];
  const baseUrl = company.website_url;

  // Blog Scanner - always run, use blog_url or fallback to /blog
  const blogUrl = company.blog_url || `${baseUrl}/blog`;
  agents.push({
    id: `blog-${company.company_id}`,
    type: 'blog_scanner',
    name: 'Blog Scanner',
    url: blogUrl,
    goal: buildBlogScannerGoal(company.company_name, blogUrl),
  });

  // News Scanner - always run via Google News
  agents.push({
    id: `news-${company.company_id}`,
    type: 'news_scanner',
    name: 'News Intelligence',
    url: 'https://news.google.com',
    goal: buildNewsScannerGoal(company.company_name),
  });

  // Hiring Monitor - use careers_url or fallback
  const careersUrl = company.careers_url || `${baseUrl}/careers`;
  agents.push({
    id: `hiring-${company.company_id}`,
    type: 'hiring_monitor',
    name: 'Hiring Monitor',
    url: careersUrl,
    goal: buildHiringMonitorGoal(company.company_name, careersUrl),
  });

  // Pricing Monitor - use pricing_url or fallback
  const pricingUrl = company.pricing_url || `${baseUrl}/pricing`;
  agents.push({
    id: `pricing-${company.company_id}`,
    type: 'pricing_monitor',
    name: 'Pricing Monitor',
    url: pricingUrl,
    goal: buildPricingMonitorGoal(company.company_name, pricingUrl),
  });

  // Product Launch Detector
  agents.push({
    id: `product-${company.company_id}`,
    type: 'product_launch_detector',
    name: 'Product Launch Detector',
    url: baseUrl,
    goal: buildProductLaunchGoal(company.company_name, baseUrl),
  });

  // GitHub Activity
  agents.push({
    id: `github-${company.company_id}`,
    type: 'github_activity',
    name: 'GitHub Activity',
    url: 'https://github.com',
    goal: buildGitHubActivityGoal(company.company_name),
  });

  // Founder Contact & Warm Intro
  agents.push({
    id: `founder-${company.company_id}`,
    type: 'founder_contact',
    name: 'Founder Contact',
    url: 'https://www.google.com',
    goal: buildFounderContactGoal(company.company_name),
  });

  // Leading Indicators Detection
  agents.push({
    id: `indicators-${company.company_id}`,
    type: 'leading_indicators',
    name: 'Leading Indicators',
    url: 'https://trends.google.com',
    goal: buildLeadingIndicatorsGoal(company.company_name),
  });

  // Competitive Intelligence
  agents.push({
    id: `competitive-${company.company_id}`,
    type: 'competitive_alerting',
    name: 'Competitive Intelligence',
    url: 'https://www.google.com',
    goal: buildCompetitiveAlertingGoal(company.company_name, baseUrl),
  });

  // Fundraising Probability Detector
  agents.push({
    id: `fundraising-${company.company_id}`,
    type: 'fundraising_detector',
    name: 'Fundraising Detector',
    url: 'https://www.google.com',
    goal: buildFundraisingDetectorGoal(company.company_name),
  });

  return agents;
}

/**
 * Run all intelligence agents in parallel for a company, streaming results via SSE
 */
export async function runIntelligenceAgents(
  company: Company,
  res: Response,
): Promise<SignalFinding[]> {
  const agents = buildIntelligenceAgents(company);
  const allFindings: SignalFinding[] = [];

  const agentPromises = agents.map((agent) => {
    const agentPromise = new Promise<void>((resolve) => {
      const callbacks: TinyfishCallbacks = {
        onConnecting: () => {
          sendSSE(res, {
            type: 'agent_connecting',
            data: {
              agentId: agent.id,
              agentType: agent.type,
              agentName: agent.name,
              status: 'connecting',
            },
          });
        },

        onBrowsing: (message: string) => {
          sendSSE(res, {
            type: 'agent_browsing',
            data: {
              agentId: agent.id,
              agentType: agent.type,
              agentName: agent.name,
              status: 'browsing',
              message,
            },
          });
        },

        onStreamingUrl: (streamingUrl: string) => {
          sendSSE(res, {
            type: 'agent_streaming_url',
            data: {
              agentId: agent.id,
              agentType: agent.type,
              agentName: agent.name,
              status: 'browsing',
              streamingUrl,
            },
          });
        },

        onStatus: (message: string) => {
          sendSSE(res, {
            type: 'agent_status',
            data: {
              agentId: agent.id,
              agentType: agent.type,
              agentName: agent.name,
              status: 'analyzing',
              message,
            },
          });
        },

        onComplete: (resultJson: unknown) => {
          const result = resultJson as { signals?: SignalFinding[] };
          const findings = result?.signals || [];
          allFindings.push(...findings);

          sendSSE(res, {
            type: 'agent_complete',
            data: {
              agentId: agent.id,
              agentType: agent.type,
              agentName: agent.name,
              status: 'complete',
              findings: { signals: findings },
            },
          });
          resolve();
        },

        onError: (error: string) => {
          sendSSE(res, {
            type: 'agent_error',
            data: {
              agentId: agent.id,
              agentType: agent.type,
              agentName: agent.name,
              status: 'error',
              error,
            },
          });
          resolve();
        },
      };

      startTinyfishAgent({ url: agent.url, goal: agent.goal }, callbacks);
    });

    // Hard timeout: if the TinyFish client's abort doesn't work, force-complete the agent
    return withTimeout(agentPromise, ORCHESTRATOR_AGENT_TIMEOUT_MS, () => {
      sendSSE(res, {
        type: 'agent_complete',
        data: {
          agentId: agent.id,
          agentType: agent.type,
          agentName: agent.name,
          status: 'complete',
          findings: { signals: [] },
          message: 'Timed out after 5 minutes',
        },
      });
    }).catch(() => {}); // swallow timeout rejection — agent is force-completed
  });

  await Promise.allSettled(agentPromises);

  // Don't send pipeline_complete here — the caller (route) handles it
  // after generating the report and sending email
  return allFindings;
}

/**
 * Run discovery agents for initial company profiling (no SSE streaming)
 * Returns structured discovery result
 */
export async function runDiscoveryAgent(
  websiteUrl: string,
  res?: Response,
): Promise<unknown> {
  return new Promise((resolve) => {
    const callbacks: TinyfishCallbacks = {
      onConnecting: () => {
        if (res) {
          sendSSE(res, {
            type: 'agent_connecting',
            data: {
              agentId: 'discovery',
              agentType: 'discovery',
              agentName: 'Company Discovery',
              status: 'connecting',
            },
          });
        }
      },
      onBrowsing: (message) => {
        if (res) {
          sendSSE(res, {
            type: 'agent_browsing',
            data: {
              agentId: 'discovery',
              agentType: 'discovery',
              agentName: 'Company Discovery',
              status: 'browsing',
              message,
            },
          });
        }
      },
      onStreamingUrl: (streamingUrl) => {
        if (res) {
          sendSSE(res, {
            type: 'agent_streaming_url',
            data: {
              agentId: 'discovery',
              agentType: 'discovery',
              agentName: 'Company Discovery',
              status: 'browsing',
              streamingUrl,
            },
          });
        }
      },
      onStatus: (message) => {
        if (res) {
          sendSSE(res, {
            type: 'agent_status',
            data: {
              agentId: 'discovery',
              agentType: 'discovery',
              agentName: 'Company Discovery',
              status: 'analyzing',
              message,
            },
          });
        }
      },
      onComplete: (result) => {
        if (res) {
          sendSSE(res, {
            type: 'discovery_complete',
            data: result,
          });
        }
        resolve(result);
      },
      onError: (error) => {
        if (res) {
          sendSSE(res, {
            type: 'agent_error',
            data: {
              agentId: 'discovery',
              agentType: 'discovery',
              agentName: 'Company Discovery',
              status: 'error',
              error,
            },
          });
        }
        resolve(null);
      },
    };

    startTinyfishAgent(
      { url: websiteUrl, goal: buildDiscoveryGoal(websiteUrl) },
      callbacks,
    );
  });
}

/**
 * Run intelligence agents without SSE (for cron jobs)
 * Returns all collected signals
 */
export async function runIntelligenceAgentsSilent(
  company: Company,
): Promise<SignalFinding[]> {
  const agents = buildIntelligenceAgents(company);
  const allFindings: SignalFinding[] = [];

  const agentPromises = agents.map((agent) => {
    const agentPromise = new Promise<void>((resolve) => {
      const callbacks: TinyfishCallbacks = {
        onConnecting: () => {},
        onBrowsing: () => {},
        onStreamingUrl: () => {},
        onStatus: () => {},
        onComplete: (resultJson: unknown) => {
          const result = resultJson as { signals?: SignalFinding[] };
          const findings = result?.signals || [];
          allFindings.push(...findings);
          resolve();
        },
        onError: () => {
          resolve();
        },
      };

      startTinyfishAgent({ url: agent.url, goal: agent.goal }, callbacks);
    });

    return withTimeout(agentPromise, ORCHESTRATOR_AGENT_TIMEOUT_MS, () => {
      console.log(`[Scheduler] Agent ${agent.id} timed out after 5.5 min`);
    }).catch(() => {});
  });

  await Promise.allSettled(agentPromises);
  return allFindings;
}
