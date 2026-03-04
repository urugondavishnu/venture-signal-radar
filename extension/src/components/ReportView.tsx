interface ReportSignal {
  title: string;
  summary: string;
  source: string;
  url?: string;
  detected_at: string;
}

interface ReportData {
  company_overview: string;
  product_launches: ReportSignal[];
  financings: ReportSignal[];
  leadership_changes: ReportSignal[];
  revenue_milestones: ReportSignal[];
  customer_wins: ReportSignal[];
  pricing_updates: ReportSignal[];
  hiring_trends: ReportSignal[];
  general_news: ReportSignal[];
  founder_contacts?: ReportSignal[];
  leading_indicators?: ReportSignal[];
  competitive_landscape?: ReportSignal[];
  fundraising_signals?: ReportSignal[];
}

interface ReportViewProps {
  companyName: string;
  generatedAt: string;
  reportData: ReportData;
}

function ReportSection({ title, items }: { title: string; items: ReportSignal[] }) {
  if (items.length === 0) return null;
  return (
    <div className="report-section">
      <h3>{title}</h3>
      {items.map((item, i) => (
        <div key={i} className="report-item">
          <div className="report-item-title">
            {item.title}
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent)', fontSize: 10, marginLeft: 6 }}
              >
                [source]
              </a>
            )}
          </div>
          <div className="report-item-summary">{item.summary}</div>
          <div className="report-item-meta">
            via {item.source} · {new Date(item.detected_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportView({ companyName, generatedAt, reportData }: ReportViewProps) {
  const date = new Date(generatedAt).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

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
    <div>
      <div
        style={{
          background: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
          padding: '12px 14px',
          borderRadius: 'var(--radius)',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700 }}>{companyName}</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>
          {date} · {totalSignals} signal{totalSignals !== 1 ? 's' : ''}
        </div>
      </div>

      {reportData.company_overview && (
        <div
          style={{
            background: 'var(--bg-primary)',
            padding: 10,
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            marginBottom: 12,
          }}
        >
          {reportData.company_overview}
        </div>
      )}

      <ReportSection title="Product Launches" items={reportData.product_launches} />
      <ReportSection title="Financings" items={reportData.financings} />
      <ReportSection title="Leadership Changes" items={reportData.leadership_changes} />
      <ReportSection title="Revenue Milestones" items={reportData.revenue_milestones} />
      <ReportSection title="Major Customer Wins" items={reportData.customer_wins} />
      <ReportSection title="Pricing Updates" items={reportData.pricing_updates} />
      <ReportSection title="Hiring Trends" items={reportData.hiring_trends} />
      <ReportSection title="General News" items={reportData.general_news} />
      <ReportSection title="Founder Contacts & Warm Intros" items={reportData.founder_contacts || []} />
      <ReportSection title="Leading Indicators" items={reportData.leading_indicators || []} />
      <ReportSection title="Competitive Landscape" items={reportData.competitive_landscape || []} />
      <ReportSection title="Fundraising Signals" items={reportData.fundraising_signals || []} />

      {totalSignals === 0 && (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
          No signals detected in this report.
        </div>
      )}
    </div>
  );
}
