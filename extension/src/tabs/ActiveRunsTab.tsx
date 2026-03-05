import { useState } from 'react';
import { ActiveRun } from '../popup/App';
import { AgentCard } from '../components/AgentCard';

interface ActiveRunsTabProps {
  activeRuns: ActiveRun[];
  onDismiss: (companyId: string) => void;
}

export function ActiveRunsTab({ activeRuns, onDismiss }: ActiveRunsTabProps) {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(
    activeRuns[0]?.companyId || null,
  );

  if (activeRuns.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Active Runs</h3>
        <p>
          Go to Companies and click "Run" on a company to launch
          intelligence agents.
        </p>
      </div>
    );
  }

  const selectedRun = activeRuns.find((r) => r.companyId === selectedCompany);

  return (
    <div>
      {/* Company Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 8,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {activeRuns.map((run) => {
          const completedAgents = run.agents.filter((a) => a.status === 'complete').length;
          const totalAgents = run.agents.length;
          const isSelected = selectedCompany === run.companyId;

          return (
            <button
              key={run.companyId}
              onClick={() => setSelectedCompany(run.companyId)}
              style={{
                padding: '6px 12px',
                background: isSelected ? 'var(--accent)' : 'var(--bg-tertiary)',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {!run.isComplete && !run.queued && (
                <span className="status-dot browsing" style={{ width: 6, height: 6 }} />
              )}
              {run.companyName}
              {run.queued ? (
                <span style={{ opacity: 0.7, fontStyle: 'italic' }}>Queued</span>
              ) : totalAgents > 0 ? (
                <span style={{ opacity: 0.7 }}>
                  {completedAgents}/{totalAgents}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Selected Run Content */}
      {selectedRun ? (
        <div>
          {/* Done Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedRun.companyName}
            </div>

            {selectedRun.isComplete && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => {
                  onDismiss(selectedRun.companyId);
                  const remaining = activeRuns.filter(
                    (r) => r.companyId !== selectedRun.companyId,
                  );
                  setSelectedCompany(remaining[0]?.companyId || null);
                }}
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Email sent indicator */}
          {selectedRun.emailSent && (
            <div style={{
              fontSize: 11,
              color: 'var(--success)',
              background: 'rgba(34,197,94,0.08)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              &#10003; Report email sent
            </div>
          )}

          {/* Progress Bar */}
          {!selectedRun.isComplete && selectedRun.agents.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 4,
              }}>
                <span>
                  {selectedRun.agents.filter((a) => a.status === 'complete').length} / {selectedRun.agents.length} agents
                </span>
                <span>
                  {Math.round(
                    (selectedRun.agents.filter((a) => a.status === 'complete').length /
                      Math.max(selectedRun.agents.length, 1)) * 100,
                  )}%
                </span>
              </div>
              <div style={{
                height: 6,
                background: 'var(--bg-primary)',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${
                    (selectedRun.agents.filter((a) => a.status === 'complete').length /
                      Math.max(selectedRun.agents.length, 1)) * 100
                  }%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--success))',
                  borderRadius: 3,
                  transition: 'width 0.5s ease-out',
                }} />
              </div>
            </div>
          )}

          {/* Agent Cards */}
          {selectedRun.agents.length === 0 && !selectedRun.isComplete && (
            <div className="empty-state" style={{ padding: 20 }}>
              <span className="spinner" style={{ fontSize: 20 }}>&#8635;</span>
              <p style={{ marginTop: 8 }}>
                {selectedRun.queued ? 'Queued — waiting for other runs to finish...' : 'Launching agents...'}
              </p>
            </div>
          )}

          {selectedRun.agents.map((agent) => (
            <AgentCard key={agent.agentId} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Select a company tab above to view agent activity.</p>
        </div>
      )}
    </div>
  );
}
