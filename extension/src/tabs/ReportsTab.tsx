import { useState, useEffect, useRef } from 'react';
import { getReports, deleteReport } from '../api/client';
import { ReportView } from '../components/ReportView';
import { ActiveRun, ReportData, ReportSignal } from '../popup/App';

interface ReportEntry {
  report_id: string;
  company_id: string;
  generated_at: string;
  report_data: ReportData;
  companies?: {
    company_name: string;
    website_url: string;
  };
}

interface ReportsTabProps {
  activeRuns: ActiveRun[];
}

// Map agent signal_type values to report keys
const SIGNAL_TYPE_TO_REPORT_KEY: Record<string, keyof Omit<ReportData, 'company_overview'>> = {
  product_launch: 'product_launches',
  financing: 'financings',
  leadership_change: 'leadership_changes',
  revenue_milestone: 'revenue_milestones',
  customer_win: 'customer_wins',
  pricing_update: 'pricing_updates',
  hiring_trend: 'hiring_trends',
  general_news: 'general_news',
  founder_contact: 'founder_contacts',
  leading_indicator: 'leading_indicators',
  competitive_landscape: 'competitive_landscape',
  fundraising_signal: 'fundraising_signals',
};

/** Build a structured live report from agent findings as they stream in */
function buildLiveReport(run: ActiveRun): ReportData {
  const report: ReportData = {
    company_overview: '',
    product_launches: [],
    financings: [],
    leadership_changes: [],
    revenue_milestones: [],
    customer_wins: [],
    pricing_updates: [],
    hiring_trends: [],
    general_news: [],
    founder_contacts: [],
    leading_indicators: [],
    competitive_landscape: [],
    fundraising_signals: [],
  };

  for (const agent of run.agents) {
    if (agent.status !== 'complete' || !agent.findings?.signals) continue;
    for (const signal of agent.findings.signals) {
      const item: ReportSignal = {
        title: signal.title,
        summary: signal.summary,
        source: signal.source,
        detected_at: new Date().toISOString(),
      };
      const key = SIGNAL_TYPE_TO_REPORT_KEY[signal.signal_type] || signal.signal_type;
      if (key in report && Array.isArray(report[key as keyof ReportData])) {
        (report[key as keyof ReportData] as ReportSignal[]).push(item);
      }
    }
  }

  // If the backend already generated a report (stored in liveReport), prefer that
  if (run.liveReport) {
    return run.liveReport as unknown as ReportData;
  }

  return report;
}

export function ReportsTab({ activeRuns }: ReportsTabProps) {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLiveId, setExpandedLiveId] = useState<string | null>(null);
  const prevCompletedRef = useRef<Set<string>>(new Set());

  // Initial load
  useEffect(() => {
    loadReports();
  }, []);

  // Reload stored reports when any run transitions to complete
  useEffect(() => {
    const completedIds = new Set(activeRuns.filter((r) => r.isComplete).map((r) => r.companyId));
    const prevCompleted = prevCompletedRef.current;

    let newCompletions = 0;
    for (const id of completedIds) {
      if (!prevCompleted.has(id)) newCompletions++;
    }

    prevCompletedRef.current = completedIds;

    if (newCompletions > 0) {
      // Staggered reloads to catch all reports being stored
      const t1 = setTimeout(loadReports, 2000);
      const t2 = setTimeout(loadReports, 6000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [activeRuns]);

  const loadReports = async () => {
    try {
      const { reports: data } = await getReports();
      setReports(data || []);
    } catch {
      // Backend offline
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.report_id !== reportId));
      if (expandedId === reportId) setExpandedId(null);
    } catch {
      // Silent fail
    }
  };

  // Active (live) runs that have at least 1 completed agent or a liveReport
  const liveRuns = activeRuns.filter(
    (r) => !r.isComplete && (r.agents.some((a) => a.status === 'complete') || r.liveReport),
  );

  // Completed runs that have report data (show until dismissed)
  const completedRuns = activeRuns.filter((r) => r.isComplete && (r.liveReport || r.agents.some((a) => a.findings?.signals?.length)));

  const hasAnyContent = liveRuns.length > 0 || completedRuns.length > 0 || reports.length > 0;

  if (loading) {
    return (
      <div className="empty-state">
        <span className="spinner" style={{ fontSize: 20 }}>&#8635;</span>
        <p style={{ marginTop: 8 }}>Loading reports...</p>
      </div>
    );
  }

  if (!hasAnyContent) {
    return (
      <div className="empty-state">
        <h3>No Reports Yet</h3>
        <p>
          Reports are generated after running intelligence agents on a company.
          Daily reports are also sent via email.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Live In-Progress Reports */}
      {liveRuns.length > 0 && (
        <>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-dot browsing" style={{ width: 6, height: 6 }} />
            Live — Agents Running ({liveRuns.length})
          </div>
          {liveRuns.map((run) => {
            const reportData = buildLiveReport(run);
            const completedCount = run.agents.filter((a) => a.status === 'complete').length;
            const totalCount = run.agents.length;
            const isExpanded = expandedLiveId === run.companyId;

            const totalSignals =
              reportData.product_launches.length +
              reportData.financings.length +
              reportData.leadership_changes.length +
              reportData.revenue_milestones.length +
              reportData.customer_wins.length +
              reportData.pricing_updates.length +
              reportData.hiring_trends.length +
              reportData.general_news.length +
              (reportData.founder_contacts?.length || 0) +
              (reportData.leading_indicators?.length || 0) +
              (reportData.competitive_landscape?.length || 0) +
              (reportData.fundraising_signals?.length || 0);

            return (
              <div key={`live-${run.companyId}`}>
                <div
                  className="card"
                  style={{ cursor: 'pointer', borderLeft: '3px solid var(--accent)' }}
                  onClick={() => setExpandedLiveId(isExpanded ? null : run.companyId)}
                >
                  <div className="card-header">
                    <div>
                      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {run.companyName}
                        <span style={{
                          fontSize: 9,
                          background: 'var(--accent)',
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: 8,
                        }}>
                          LIVE
                        </span>
                      </div>
                      <div className="card-subtitle">
                        {completedCount}/{totalCount} agents done · {totalSignals} signal{totalSignals !== 1 ? 's' : ''} so far
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        color: 'var(--text-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    >
                      &#9660;
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 4px 12px' }}>
                    <ReportView
                      companyName={run.companyName}
                      generatedAt={new Date().toISOString()}
                      reportData={reportData}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Completed Run Reports (not yet dismissed, not yet in DB) */}
      {completedRuns.length > 0 && (
        <>
          <div className="section-header">Just Completed ({completedRuns.length})</div>
          {completedRuns.map((run) => {
            const reportData = buildLiveReport(run);
            const isExpanded = expandedLiveId === `done-${run.companyId}`;

            const totalSignals =
              reportData.product_launches.length +
              reportData.financings.length +
              reportData.leadership_changes.length +
              reportData.revenue_milestones.length +
              reportData.customer_wins.length +
              reportData.pricing_updates.length +
              reportData.hiring_trends.length +
              reportData.general_news.length +
              (reportData.founder_contacts?.length || 0) +
              (reportData.leading_indicators?.length || 0) +
              (reportData.competitive_landscape?.length || 0) +
              (reportData.fundraising_signals?.length || 0);

            return (
              <div key={`done-${run.companyId}`}>
                <div
                  className="card"
                  style={{ cursor: 'pointer', borderLeft: '3px solid var(--success)' }}
                  onClick={() => setExpandedLiveId(isExpanded ? null : `done-${run.companyId}`)}
                >
                  <div className="card-header">
                    <div>
                      <div className="card-title">{run.companyName}</div>
                      <div className="card-subtitle">
                        Just completed · {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
                        {run.emailSent && ' · Email sent'}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        color: 'var(--text-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    >
                      &#9660;
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 4px 12px' }}>
                    <ReportView
                      companyName={run.companyName}
                      generatedAt={new Date().toISOString()}
                      reportData={reportData}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Stored Reports from DB */}
      {reports.length > 0 && (
        <>
          <div className="section-header">Intelligence Reports ({reports.length})</div>

          {reports.map((report) => {
            const companyName =
              report.companies?.company_name || `Company ${report.company_id.slice(0, 8)}`;
            const isExpanded = expandedId === report.report_id;

            const totalSignals =
              report.report_data.product_launches.length +
              report.report_data.financings.length +
              report.report_data.leadership_changes.length +
              report.report_data.revenue_milestones.length +
              report.report_data.customer_wins.length +
              report.report_data.pricing_updates.length +
              report.report_data.hiring_trends.length +
              report.report_data.general_news.length +
              (report.report_data.founder_contacts?.length || 0) +
              (report.report_data.leading_indicators?.length || 0) +
              (report.report_data.competitive_landscape?.length || 0) +
              (report.report_data.fundraising_signals?.length || 0);

            return (
              <div key={report.report_id}>
                <div
                  className="card"
                  style={{ cursor: 'pointer' }}
                  onClick={() =>
                    setExpandedId(isExpanded ? null : report.report_id)
                  }
                >
                  <div className="card-header">
                    <div>
                      <div className="card-title">{companyName}</div>
                      <div className="card-subtitle">
                        {new Date(report.generated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: totalSignals > 0 ? 'var(--success)' : 'var(--text-muted)',
                        }}
                      >
                        {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(report.report_id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: 10,
                          cursor: 'pointer',
                          opacity: 0.6,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--error)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                        title="Delete report"
                      >
                        Delete
                      </button>
                      <span
                        style={{
                          fontSize: 14,
                          color: 'var(--text-muted)',
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      >
                        &#9660;
                      </span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 4px 12px' }}>
                    <ReportView
                      companyName={companyName}
                      generatedAt={report.generated_at}
                      reportData={report.report_data}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
