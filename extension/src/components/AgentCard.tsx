import { AgentState } from '../api/client';

interface AgentCardProps {
  agent: AgentState;
}

const STATUS_LABELS: Record<string, string> = {
  connecting: 'Connecting',
  browsing: 'Browsing',
  analyzing: 'Analyzing',
  complete: 'Complete',
  error: 'Error',
};

export function AgentCard({ agent }: AgentCardProps) {
  const isActive = agent.status === 'browsing' || agent.status === 'analyzing' || agent.status === 'connecting';
  const signalCount = agent.findings?.signals?.length || 0;

  return (
    <div
      className="card agent-card"
      style={{ borderColor: agent.status === 'complete' ? 'rgba(34,197,94,0.3)' : undefined }}
    >
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`status-dot ${agent.status}`} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{agent.agentName}</span>
        </div>
        <span className={`badge badge-${agent.status}`}>
          {STATUS_LABELS[agent.status] || agent.status}
        </span>
      </div>

      {agent.streamingUrl && isActive && (
        <div className="live-preview">
          <iframe
            src={agent.streamingUrl}
            title={`Live: ${agent.agentName}`}
            sandbox="allow-scripts allow-same-origin"
          />
          <span className="live-preview-label">
            <span className="status-dot browsing" style={{ width: 6, height: 6, marginRight: 4 }} />
            LIVE
          </span>
        </div>
      )}

      {agent.message && isActive && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{agent.message}</div>
      )}

      {agent.status === 'complete' && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 11, color: signalCount > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
            {signalCount > 0 ? `${signalCount} signal${signalCount !== 1 ? 's' : ''} detected` : '0 results found'}
          </div>
          {agent.findings?.signals?.slice(0, 3).map((s, i) => (
            <div key={i} className="insight-item" style={{ marginTop: 4 }}>
              <span className="insight-agent">{s.signal_type.replace(/_/g, ' ')}</span>
              <span className="insight-text">{s.title}</span>
            </div>
          ))}
        </div>
      )}

      {agent.status === 'error' && agent.error && (
        <div style={{ fontSize: 11, color: 'var(--error)', marginTop: 4 }}>{agent.error}</div>
      )}
    </div>
  );
}
