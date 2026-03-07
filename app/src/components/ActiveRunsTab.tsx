import { useState } from 'react';
import { ActiveRun } from '../api/client';
import { AgentCard } from './AgentCard';

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
        <p>Go to Companies and click "Run" to launch intelligence agents.</p>
      </div>
    );
  }

  const selectedRun = activeRuns.find((r) => r.companyId === selectedCompany);

  return (
    <div className="tab-panel">
      {/* Company Sub-Tabs */}
      <div className="run-tabs">
        {activeRuns.map((run) => {
          const completedAgents = run.agents.filter((a) => a.status === 'complete').length;
          const totalAgents = run.agents.length;
          const isSelected = selectedCompany === run.companyId;

          return (
            <button
              key={run.companyId}
              onClick={() => setSelectedCompany(run.companyId)}
              className={`run-tab ${isSelected ? 'active' : ''}`}
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
          <div className="run-header">
            <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedRun.companyName}</div>
            {selectedRun.isComplete && (
              <button
                className="btn btn-success btn-sm"
                onClick={() => {
                  onDismiss(selectedRun.companyId);
                  const remaining = activeRuns.filter((r) => r.companyId !== selectedRun.companyId);
                  setSelectedCompany(remaining[0]?.companyId || null);
                }}
              >
                Dismiss
              </button>
            )}
          </div>

          {/* Email sent indicator */}
          {selectedRun.emailSent && (
            <div className="email-sent-badge">
              &#10003; Report email sent (check spam and updates folders)
            </div>
          )}

          {/* Progress Bar */}
          {!selectedRun.isComplete && selectedRun.agents.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div className="progress-info">
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
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${
                      (selectedRun.agents.filter((a) => a.status === 'complete').length /
                        Math.max(selectedRun.agents.length, 1)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Loading / Queued state */}
          {selectedRun.agents.length === 0 && !selectedRun.isComplete && (
            <div className="empty-state" style={{ padding: 40 }}>
              <span className="spinner" style={{ fontSize: 24 }}>&#8635;</span>
              <p style={{ marginTop: 8 }}>
                {selectedRun.queued
                  ? 'Queued — waiting for a running company to finish...'
                  : 'Launching agents...'}
              </p>
            </div>
          )}

          {/* Agent Cards */}
          <div className="agent-grid">
            {selectedRun.agents.map((agent) => (
              <AgentCard key={agent.agentId} agent={agent} />
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p>Select a company tab above to view agent activity.</p>
        </div>
      )}
    </div>
  );
}
