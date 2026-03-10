// ============================================
// Shared Types for Daily Delta
// ============================================

// ---------- Database Entities ----------

export interface User {
  user_id: string;
  email: string;
  created_at: string;
}

export interface Company {
  company_id: string;
  user_id: string;
  company_name: string;
  website_url: string;
  domain: string;
  description: string | null;
  industry: string | null;
  founding_year: number | null;
  headquarters: string | null;
  company_size: string | null;
  detected_products: string[] | null;
  careers_url: string | null;
  blog_url: string | null;
  pricing_url: string | null;
  created_at: string;
  last_agent_run: string | null;
  tracking_status: 'active' | 'paused' | 'archived';
}

export type SignalType =
  | 'product_launch'
  | 'financing'
  | 'leadership_change'
  | 'revenue_milestone'
  | 'customer_win'
  | 'pricing_update'
  | 'hiring_trend'
  | 'partnership'
  | 'general_news'
  | 'founder_contact'
  | 'leading_indicator'
  | 'competitive_landscape'
  | 'fundraising_signal';

export interface Signal {
  signal_id: string;
  company_id: string;
  signal_type: SignalType;
  source: string;
  title: string;
  content: string;
  url: string | null;
  detected_at: string;
}

export interface Report {
  report_id: string;
  company_id: string;
  generated_at: string;
  report_data: ReportData;
}

export interface ReportData {
  company_overview: string;
  product_launches: ReportSignal[];
  financings: ReportSignal[];
  leadership_changes: ReportSignal[];
  revenue_milestones: ReportSignal[];
  customer_wins: ReportSignal[];
  pricing_updates: ReportSignal[];
  hiring_trends: ReportSignal[];
  general_news: ReportSignal[];
  founder_contacts: ReportSignal[];
  leading_indicators: ReportSignal[];
  competitive_landscape: ReportSignal[];
  fundraising_signals: ReportSignal[];
}

export interface ReportSignal {
  title: string;
  summary: string;
  source: string;
  url?: string;
  detected_at: string;
}

// ---------- API Request / Response ----------

export interface StoreCompanyRequest {
  website_url: string;
  page_title?: string;
}

export interface StoreCompanyResponse {
  success: boolean;
  company: Company;
}

export interface RunAgentsRequest {
  company_id: string;
}

export interface SetEmailRequest {
  email: string;
}

// ---------- Agent System ----------

export type AgentType =
  | 'discovery'
  | 'blog_scanner'
  | 'news_scanner'
  | 'hiring_monitor'
  | 'pricing_monitor'
  | 'product_launch_detector'
  | 'github_activity'
  | 'founder_contact'
  | 'leading_indicators'
  | 'competitive_alerting'
  | 'fundraising_detector';

export interface AgentConfig {
  id: string;
  type: AgentType;
  name: string;
  url: string;
  goal: string;
  company_id: string;
}

export type AgentStatus =
  | 'idle'
  | 'connecting'
  | 'browsing'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface AgentStatusUpdate {
  agentId: string;
  agentType: AgentType;
  agentName: string;
  status: AgentStatus;
  message?: string;
  streamingUrl?: string;
  progress?: number;
  findings?: AgentFindings;
  error?: string;
}

export interface AgentFindings {
  signals: SignalFinding[];
  metadata?: Record<string, unknown>;
}

export interface SignalFinding {
  signal_type: SignalType;
  title: string;
  summary: string;
  source: string;
  url?: string;
}

// ---------- SSE Events ----------

export type SSEEventType =
  | 'agent_connecting'
  | 'agent_browsing'
  | 'agent_streaming_url'
  | 'agent_status'
  | 'agent_complete'
  | 'agent_error'
  | 'pipeline_complete'
  | 'pipeline_error'
  | 'discovery_complete';

export interface SSEEvent {
  type: SSEEventType;
  data: AgentStatusUpdate | { message: string } | Company;
}

// ---------- Discovery Agent Output ----------

export interface DiscoveryResult {
  company_name: string;
  description: string;
  industry: string;
  products: string[];
  headquarters: string;
  founding_year: number | null;
  company_size: string;
  leadership: string[];
  careers_url: string;
  blog_url: string;
  pricing_url: string;
  pricing_model: string;
}
