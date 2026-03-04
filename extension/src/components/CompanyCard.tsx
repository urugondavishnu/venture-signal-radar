
interface CompanyCardProps {
  company: {
    company_id: string;
    company_name: string;
    website_url: string;
    domain: string;
    industry?: string | null;
    description?: string | null;
    last_agent_run?: string | null;
  };
  onRun: (companyId: string, companyName: string) => void;
  onDelete: (companyId: string) => void;
  isRunning: boolean;
  runDisabled: boolean;
  isDiscovering: boolean;
}

export function CompanyCard({ company, onRun, onDelete, isRunning, runDisabled, isDiscovering }: CompanyCardProps) {
  const lastRun = company.last_agent_run
    ? new Date(company.last_agent_run).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card-title">{company.company_name}</div>
          <div className="card-subtitle">
            {company.domain}
            {company.industry && ` · ${company.industry}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isDiscovering && (
            <span className="badge badge-analyzing" style={{ fontSize: 9 }}>
              <span className="spinner" style={{ fontSize: 9 }}>&#8635;</span>
              Enriching
            </span>
          )}
          <button
            className={`btn btn-sm ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => onRun(company.company_id, company.company_name)}
            disabled={isRunning || runDisabled}
          >
            {isRunning ? (
              <>
                <span className="spinner">&#8635;</span> Running
              </>
            ) : (
              'Run'
            )}
          </button>
        </div>
      </div>

      {company.description && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
          {company.description.length > 120
            ? company.description.slice(0, 120) + '...'
            : company.description}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          Last run: {lastRun}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(company.company_id); }}
          disabled={isRunning || isDiscovering}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 10,
            cursor: isRunning || isDiscovering ? 'default' : 'pointer',
            opacity: isRunning || isDiscovering ? 0.3 : 0.6,
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { if (!isRunning && !isDiscovering) e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--error)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          title="Remove company"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
