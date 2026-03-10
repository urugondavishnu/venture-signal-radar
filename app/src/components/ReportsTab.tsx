import { useState, useEffect, useCallback } from 'react';
import { getReports, deleteReport, sendReportEmail, previewReportEmail, Report, ReportData } from '../api/client';

interface ReportsTabProps {
  triggerReload: number;
}

const SECTION_LABELS: { key: keyof ReportData; label: string }[] = [
  { key: 'product_launches', label: 'Product Launches' },
  { key: 'financings', label: 'Financings' },
  { key: 'leadership_changes', label: 'Leadership Changes' },
  { key: 'revenue_milestones', label: 'Revenue Milestones' },
  { key: 'customer_wins', label: 'Customer Wins' },
  { key: 'pricing_updates', label: 'Pricing Updates' },
  { key: 'hiring_trends', label: 'Hiring Trends' },
  { key: 'general_news', label: 'General News' },
  { key: 'founder_contacts', label: 'Founder Contacts' },
  { key: 'leading_indicators', label: 'Leading Indicators' },
  { key: 'competitive_landscape', label: 'Competitive Landscape' },
  { key: 'fundraising_signals', label: 'Fundraising Signals' },
];

export function ReportsTab({ triggerReload }: ReportsTabProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [emailingId, setEmailingId] = useState<string | null>(null);
  const [emailSentId, setEmailSentId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const data = await getReports();
      setReports(data.sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports, triggerReload]);

  const handleDelete = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId) return;
    setDeletingId(reportId);
    try {
      await deleteReport(reportId);
      setReports((prev) => prev.filter((r) => r.report_id !== reportId));
      if (expandedId === reportId) setExpandedId(null);
    } catch {
      alert('Failed to delete report.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePreview = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const html = await previewReportEmail(reportId);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
      }
    } catch {
      alert('Failed to load preview.');
    }
  };

  const handleSendEmail = async (reportId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (emailingId) return;
    setEmailingId(reportId);
    setEmailSentId(null);
    try {
      const result = await sendReportEmail(reportId);
      if (result.success) {
        setEmailSentId(reportId);
        setTimeout(() => setEmailSentId(null), 4000);
      } else {
        alert(result.error || 'Failed to send email.');
      }
    } catch {
      alert('Failed to send email.');
    } finally {
      setEmailingId(null);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <span className="spinner" style={{ fontSize: 24 }}>&#8635;</span>
        <p>Loading reports...</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Reports Yet</h3>
        <p>Run intelligence agents on a company to generate reports.</p>
      </div>
    );
  }

  return (
    <div className="tab-panel">
      {reports.map((report) => {
        const isExpanded = expandedId === report.report_id;
        const rd = report.report_data;
        const totalSignals = SECTION_LABELS.reduce(
          (sum, s) => sum + ((rd[s.key] as unknown[])?.length || 0),
          0,
        );

        return (
          <div key={report.report_id} className="card report-card">
            <div
              className="report-card-header"
              onClick={() => setExpandedId(isExpanded ? null : report.report_id)}
            >
              <div style={{ flex: 1 }}>
                <div className="card-title">{rd.company_overview?.slice(0, 60) || 'Report'}</div>
                <div className="card-subtitle">
                  {new Date(report.generated_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                  {' · '}
                  {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={(e) => handlePreview(report.report_id, e)}
                >
                  Preview
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={(e) => handleSendEmail(report.report_id, e)}
                  disabled={emailingId === report.report_id || emailSentId === report.report_id}
                >
                  {emailSentId === report.report_id
                    ? '✓ Sent'
                    : emailingId === report.report_id
                      ? 'Sending...'
                      : 'Email'}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => handleDelete(report.report_id, e)}
                  disabled={deletingId === report.report_id}
                >
                  {deletingId === report.report_id ? '...' : 'Delete'}
                </button>
                <span className="expand-icon">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="report-body">
                <p className="report-overview">{rd.company_overview}</p>
                {SECTION_LABELS.map((section) => {
                  const items = rd[section.key] as { title: string; summary: string; source: string; url?: string }[];
                  if (!items || items.length === 0) return null;
                  return (
                    <div key={section.key} className="report-section">
                      <h3>{section.label}</h3>
                      {items.map((item, i) => (
                        <div key={i} className="report-item">
                          <div className="report-item-title">
                            {item.title}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="report-link">
                                [{item.source}]
                              </a>
                            )}
                          </div>
                          <div className="report-item-summary">{item.summary}</div>
                          <div className="report-item-meta">via {item.source}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
